# Q&A Phase Features

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

Features that enhance the question/answer experience during CPO, Clarify, and CTO workflows. These features reduce cognitive load, improve decision-making, and create immediate feedback loops during specification generation.

**When to Use:** Active during all Q&A workflow sessions (CPO → Clarify → CTO).

---

## Workflow Integration

### F7: Automatic Clarify Phase

#### Description

AI-driven ambiguity detection that runs automatically after CPO phase completes, surfacing unclear requirements before technical design begins.

#### Requirements

**Triggers:**
- Runs automatically when CPO phase marked complete
- Can be re-run manually at any time

**Detection Rules:**
| Issue Type | Example | Detection Method |
|------------|---------|------------------|
| Vague Language | "fast", "user-friendly" | Keyword matching |
| Missing Edge Cases | No error handling defined | Pattern analysis |
| Ambiguous Flows | Multiple interpretations | AI reasoning |
| Feature Conflicts | Contradicting requirements | Cross-reference check |

**Output:**
- List of identified ambiguities
- Context and reasoning for each
- Suggested clarification questions
- Severity (high/medium/low)

#### UX Design

**Automatic Prompt (after CPO):**
```
┌─────────────────────────────────────────────────────────────┐
│ Clarify Phase                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ I found 3 areas that need clarification before technical    │
│ design:                                                     │
│                                                             │
│ 🔴 High Priority (1)                                        │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ "Secure authentication"                                 ││
│ │                                                         ││
│ │ What does "secure" mean specifically?                   ││
│ │ ○ OAuth 2.0 with MFA                                    ││
│ │ ○ Email/password with rate limiting                     ││
│ │ ○ Enterprise SSO (SAML/OIDC)                            ││
│ │ ○ [Custom answer]                                       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 🟡 Medium Priority (2)                                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ "Fast response times"                                   ││
│ │ What is the target latency?                             ││
│ │ ○ < 100ms (real-time)                                   ││
│ │ ○ < 500ms (interactive)                                 ││
│ │ ○ < 2s (acceptable)                                     ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [Defer All to CTO]                [Answer & Continue]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Approach

**Clarify Agent:**
- Sub-agent of Orchestrator
- Analyzes all CPO-phase outputs
- Uses predefined rules + AI reasoning
- Generates structured questions

**State Management:**
```typescript
interface ClarifyState {
  ambiguities: Ambiguity[];
  resolvedCount: number;
  deferredCount: number;
  status: 'pending' | 'in_progress' | 'resolved';
}

interface Ambiguity {
  id: string;
  featureId: string;
  type: 'vague_language' | 'missing_edge_case' | 'ambiguous_flow' | 'conflict';
  severity: 'high' | 'medium' | 'low';
  text: string;           // The problematic text
  context: string;        // Where it appears
  question: string;       // Clarification question
  options?: string[];     // Suggested answers
  resolution?: string;    // User's answer
  deferred: boolean;
}
```

#### Decision Reference

See: [decisions.md](../decisions.md) D17 (Clarify Phase - Automatic)

---

## Cognitive Load Reduction Features

### F14: Smart Question Batching

#### Description

Groups 2-5 related questions with shared context, reducing mental overhead of topic switching during Q&A sessions. Based on Miller's Law (7±2 cognitive limit).

#### Requirements

**Batching Rules:**
| Rule | Description |
|------|-------------|
| Topic Clustering | Group questions by semantic domain (auth, data model, UX) |
| Dependency Ordering | Foundational questions first within each batch |
| Batch Size | 3-5 questions per batch (max 7) |
| Context Window | Each batch shares a context preamble explaining the topic |

**Batch Properties:**
- Topic name and description
- 2-7 related questions
- Estimated completion time
- Progress indicator (X/Y answered)
- Batch position (N of M total batches)

**Question Dependencies:**
- Questions can depend on previous answers within batch
- Dependent questions unlock when condition is met
- Skip remaining allows jumping to next batch

#### UX Design

See: [ux.md](ux.md) → "Question Batching UI (Feature 1)"

#### Technical Approach

**Tool:** `PresentQuestionBatch` (see [tools.md](../tools.md))

**State Management:**
- `batchingState` slice in Zustand store
- SSE events: `batch`, `batch_question_answered`, `batch_complete`

**AI Prompt Addition:**
```yaml
question_batching_instructions: |
  Before asking questions, group them by semantic domain:
  1. TOPIC CLUSTERING: Authentication together, data model together, UX together
  2. DEPENDENCY ORDERING: Foundational questions first within each batch
  3. BATCH SIZE: 3-5 questions per batch (max 7, per Miller's Law)
  4. CONTEXT WINDOW: Each batch shares a context preamble explaining the topic
```

---

### F15: Live Spec Preview Panel

#### Description

Shows specs updating in real-time as answers are provided, creating immediate feedback loops that reduce outcome uncertainty.

#### Requirements

**Preview Types:**
| Type | Content |
|------|---------| | Summary | Artifact counts, high-level changes |
| Diff View | +/- line-by-line changes |
| Full Spec | Complete artifact content |

**Layout Options:**
- Split View (50/50): Default during Q&A
- Collapsed Preview: Small screens, user preference
- Full Preview: Reviewing before phase transition

**Animation Patterns:**
- New content: Fade in (200ms) with green highlight pulse
- Modified content: Yellow highlight (300ms), then fade
- Removed content: Red strikethrough, then collapse (400ms)
- Pending changes: Dashed border with "~" prefix

#### UX Design

See: [ux.md](ux.md) → "Live Spec Preview Panel (Feature 2)"

#### Technical Approach

**Tool:** `EmitSpecPreview` (see [tools.md](../tools.md))

**State Management:**
- `livePreview` slice in Zustand store
- Position: 'right' | 'bottom'
- Diff mode: 'unified' | 'split' | 'highlight'

**SSE Events:**
- `spec_update`: Granular spec changes
- `spec_preview_chunk`: Streaming large updates
- `spec_preview_pending`: Uncommitted changes
- `spec_preview_commit`: Confirmed changes

---

### F16: AI Recommendation Badges

#### Description

Shows AI-suggested answers with confidence levels, reducing decision paralysis for questions with clear best practices or project context matches.

#### Requirements

**Confidence Levels:**
| Level | Criteria | Visual |
|-------|----------|--------|
| High (>80%) | Strong source + no contradicting signals + domain match | Blue filled badge |
| Medium (50-80%) | ≤2 hops inference or partial match | Gray badge |
| None | Equal options, high business impact, or conflicts | No badge |

**Recommendation Sources:**
- `constitution`: Matches project constitution rules
- `best_practice`: Industry standard or common pattern
- `context_inference`: Derived from previous answers
- `majority_usage`: Common choice in similar projects

**When NOT to Recommend:**
- Choices are equally valid (personal preference)
- High business impact (pricing, features to cut)
- Conflicts with stated user preferences

#### UX Design

See: [ux.md](ux.md) → "AI Recommendation Badges (Feature 3)"

#### Technical Approach

**Schema:** Extended `recommendation` field on `AskUserQuestion` tool (see [tools.md](../tools.md))

**AI Prompt Addition:**
```yaml
recommendation_instructions: |
  For each question with options, you MAY provide a recommendation if:

  RECOMMEND when:
  - Industry best practice exists
  - Constitution specifies a preference
  - Previous answers strongly imply a choice

  DO NOT recommend when:
  - Choices are equally valid (personal preference)
  - High business impact (pricing, features to cut)
  - Conflicts with stated user preferences
```

---

### F17: Decision Journal + Undo Timeline

#### Description

Browsable timeline of all decisions made during Q&A with ability to jump back to any point. Supports cascading undo to maintain spec consistency.

#### Requirements

**Decision Properties:**
| Property | Description |
|----------|-------------|
| Question/Answer | What was asked and answered |
| Category | product_scope, data_model, api_design, etc. |
| Phase | CPO, Clarify, or CTO |
| Artifacts Affected | Which spec sections changed |
| Cascade Group | Groups related decisions for undo |
| Reversibility | Easy, moderate, or significant effort |

**Cascading Undo:**
- Jump to any decision point
- Preview all decisions that will be undone
- Show affected artifacts before confirming
- Maintain referential integrity

**Decision Entry States:**
- `●` Current/recent decision (filled circle)
- `○` Past decision (hollow circle)
- `◐` Partially undone decision (half-filled)

#### UX Design

See: [ux.md](ux.md) → "Decision Journal UI (Feature 4)"

#### Technical Approach

**SQLite Table:** `decisions` (see [data-model.md](data-model.md))

**Tool:** `LogDecision` (see [tools.md](../tools.md))

**State Management:**
- `decisionJournal` slice in Zustand store
- Filter by phase, feature, or all
- Preview cascade before confirming

**SSE Events:**
- `decision_logged`: New decision recorded
- `decisions_undone`: Cascade undo completed

---

### F18: Impact Preview on Hover

#### Description

When hovering over an option, shows what artifacts will be affected if selected. Reduces consequence blindness by making downstream effects visible before commitment.

#### Requirements

**Preview Content:**
| Section | Description |
|---------|-------------|
| Summary | "Adds 2 entities, 3 endpoints" |
| Spec Changes | Which sections and estimated field count |
| Additional Questions | ~N more questions on topics X, Y |
| Dependencies | Creates/removes which dependencies |
| Pros/Cons | Trade-off analysis |
| Reversibility | Easy, moderate, or significant |

**Timing:**
- Delay before show: 400ms (prevent accidental triggers)
- Fade in: 150ms
- Persist after mouse leave: 200ms (grace period)
- Keyboard focus: 0ms (immediate)

**Popover Positioning:**
- Top of list → Below and right
- Middle of list → Right side
- Bottom of list → Above and right
- Near right edge → Left side
- Width: 320px, Max height: 280px

#### UX Design

See: [ux.md](ux.md) → "Impact Preview on Hover (Feature 7)"

#### Technical Approach

**Schema:** Extended `impactPreview` field on options (see [tools.md](../tools.md))

**State Management:**
- `impactPreview` slice in Zustand store
- Cache previews for session duration
- Invalidate on schema/api/dependency changes

**SSE Events:**
- `impact_preview_ready`: Preview computed
- `impact_preview_invalidated`: Cache cleared

---

### F19: "Why This Question?" Explainers

#### Description

Expandable context explaining why each question is being asked and what it affects. Reduces relevance confusion by showing the connection between questions and spec outcomes.

#### Requirements

**Explainer Content:**
| Section | Description |
|---------|-------------|
| Connection | How this relates to previous answers |
| Purpose | What this information will be used for |
| Downstream | Which artifacts will be affected (bulleted list) |
| Example | Concrete example of how answer shapes spec |
| Related Answer | Link to relevant previous answer |

**Display Logic:**
- **Expanded by default**: Technical questions, >3 options, CTO phase, first in batch
- **Collapsed by default**: Simple yes/no, user has answered similar before

#### UX Design

See: [ux.md](ux.md) → ""Why This Question?" Explainer (Feature 9)"

#### Technical Approach

**Schema:** Extended `explainer` field on `AskUserQuestion` (see [tools.md](../tools.md))

**State Management:**
- `explainerState` slice in Zustand store
- Track expanded/collapsed per question
- Global default setting

**AI Prompt Addition:**
```yaml
question_context_instructions: |
  For every question, generate a "Why This Question?" explainer:

  STRUCTURE:
  1. CONNECTION: How this relates to previous answers (1 sentence)
  2. PURPOSE: What this information will be used for (1-2 sentences)
  3. DOWNSTREAM: What artifacts will be affected (bulleted list)
  4. EXAMPLE: Concrete example of how answer shapes the spec

  AVOID:
  - Circular reasoning ("I'm asking to know your answer")
  - Vague purpose ("This helps with the spec")
  - Missing downstream link (always show concrete impact)
```

---

### F20: Keyboard Quick Responses

#### Description

Enables rapid answering via keyboard for power users. Number keys select options, letter keys for common actions, reducing physical navigation overhead.

#### Requirements

**Key Mappings:**
| Key | Single Choice | Multiple Choice | Boolean | Text |
|-----|---------------|-----------------|---------|------|
| `1-9` | Select option N | Toggle option N | - | - |
| `Y` | - | - | Select Yes | - |
| `N` | - | - | Select No | - |
| `A` | - | Select All | Accept recommendation | - |
| `X` | - | Clear All | - | - |
| `Enter` | Submit | Submit | Submit | Submit |
| `S` | Skip | Skip | Skip | Skip |
| `?` | Toggle explainer | Toggle explainer | Toggle explainer | Toggle explainer |
| `Tab` | Next option | Next option | - | - |
| `Escape` | Cancel | Cancel | Cancel | Cancel |

**Within Batches:**
| Key | Action |
|-----|--------|
| `Tab` | Next question in batch |
| `Shift+Tab` | Previous question in batch |
| `Enter` | Submit entire batch |

**Confirmation Patterns:**
- **No confirmation**: Low-stakes + >1s response time
- **Soft confirmation**: Fast selection (<500ms) on non-recommended: "Selected X. Continue? (Y/n)"
- **Full confirmation**: High-stakes + fast selection: "This affects 5 spec fields. Press Enter to confirm."

#### UX Design

See: [ux.md](ux.md) → "Q&A Quick Response Shortcuts (Feature 10)"

#### Technical Approach

**State Management:**
- `keyboardState` slice in Zustand store
- Context-aware: global, qa_single, qa_multi, qa_text, qa_batch
- Show/hide shortcut hints setting

**Visual Affordances:**
- Number badges next to each option
- Active badge uses accent color
- Shortcut hint bar below options (toggleable)

**Conflict Handling:**
- Number keys only active when Q&A panel focused
- Text input questions disable number shortcuts
- `Cmd+K` reserved for command palette

---

## Token Budget Impact

**Total additional tokens per feature session: ~65,000**

| Feature | Per Occurrence | Frequency | Session Total |
|---------|----------------|-----------|---------------|
| F14: Question Batching | 2,200 | 5 batches | ~11,000 |
| F15: Live Spec Preview | 1,100 | 20 answers | ~22,000 |
| F16: AI Recommendations | 200 | 10 questions | ~2,000 |
| F17: Decision Journal | 400 | 20 decisions | ~8,000 |
| F18: Impact Preview | 800 | 15 questions | ~12,000 |
| F19: Explainers | 400 | 25 questions | ~10,000 |
| F20: Keyboard Shortcuts | 0 | N/A | 0 |

---

## Dependencies

- **F16 (AI Recommendations)** uses [F6: Constitution](features-setup.md#f6-project-constitution) for preference matching
- **F17 (Decision Journal)** integrates with undo system (see [../data-model.md](../data-model.md))
- **F18 (Impact Preview)** requires dependency graph computation (see [features-management.md](features-management.md#f4-cross-references))
