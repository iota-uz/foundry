# AI Q&A Flow Specification

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

The AI Q&A flow is the core interaction model for building specifications. This document details question types, navigation, phase transitions, and workflow state management.

**Architecture:** Q&A is implemented as **workflows** (deterministic step sequences) rather than autonomous agents. This provides:
- Predictable question progression through predefined topics
- AI-generated questions within topic constraints
- Clear progress tracking ("Question 8 of ~20")
- Reliable pause/resume via workflow state checkpoints

**Technical Reference:** For Claude SDK streaming patterns and event specifications, see [research/claude-agent-sdk-apis.md](research/claude-agent-sdk-apis.md)

---

## Question Types

### Supported Input Types

| Type | Use Case | Example |
|------|----------|---------|
| Single Choice | One option from list | "What database will you use?" |
| Multiple Choice | Several options from list | "Which user roles exist?" |
| Text Input | Names, descriptions | "What is the feature name?" |
| Number Input | Quantities, limits | "Maximum file upload size (MB)?" |
| Date Input | Deadlines, schedules | "Target launch date?" |

### Question Structure

```typescript
interface AIQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'number' | 'date';
  question: string;
  description?: string;           // Additional context
  options?: QuestionOption[];     // For choice questions
  validation?: ValidationRule;    // For input questions
  required: boolean;
  defaultValue?: any;
  context?: string;               // Why AI is asking this
}

interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;                  // Optional visual indicator
}

interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;               // Regex for text
  message: string;                // Error message
}
```

### Question Examples

**Single Choice:**
```yaml
type: single_choice
question: "What type of authentication will you use?"
options:
  - id: email_password
    label: "Email + Password"
    description: "Traditional username/password authentication"
  - id: oauth
    label: "OAuth 2.0"
    description: "Sign in with Google, GitHub, etc."
  - id: magic_link
    label: "Magic Link"
    description: "Passwordless email login"
  - id: both
    label: "Multiple Methods"
    description: "Offer several auth options"
```

**Multiple Choice:**
```yaml
type: multiple_choice
question: "Which OAuth providers should be supported?"
options:
  - id: google
    label: "Google"
  - id: github
    label: "GitHub"
  - id: apple
    label: "Apple"
  - id: microsoft
    label: "Microsoft"
```

**Text Input:**
```yaml
type: text
question: "What should this feature be called?"
validation:
  pattern: "^[a-z][a-z0-9-]*$"
  message: "Use lowercase letters, numbers, and hyphens only"
defaultValue: "user-authentication"
```

**Number Input:**
```yaml
type: number
question: "Maximum login attempts before lockout?"
validation:
  min: 1
  max: 10
  message: "Must be between 1 and 10"
defaultValue: 5
```

---

## Navigation

### Full Navigation Model

Users can:
1. **Skip questions** - AI adapts, may ask later
2. **Go back** - Revisit and change previous answers
3. **Edit previous answers** - Triggers re-evaluation

### Navigation UI

```
┌─────────────────────────────────────────────────────────────┐
│ Q&A Session: User Authentication                   [⏸ Pause]│
├─────────────────────────────────────────────────────────────┤
│ Progress: ████████░░░░░░░░ Question 8 of ~20                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Previous Answers:                                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Q1: Feature name                                        ││
│ │ A: "user-authentication"                         [Edit] ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ Q2: Authentication type                                 ││
│ │ A: Email + Password, OAuth                       [Edit] ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ Q3: OAuth providers                                     ││
│ │ A: Google, GitHub                                [Edit] ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Current Question:                                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Should failed login attempts be rate limited?           ││
│ │                                                         ││
│ │ ○ Yes, with lockout after N attempts                    ││
│ │ ○ Yes, with CAPTCHA after N attempts                    ││
│ │ ○ No rate limiting                                      ││
│ │                                                         ││
│ │ [Skip]                               [Answer & Continue] ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [← Back]                                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Edit Previous Answer

When user clicks [Edit] on a previous answer:

1. Show the original question with current answer pre-filled
2. User modifies answer
3. Save new answer
4. **Trigger re-evaluation** - AI reviews change and may:
   - Ask follow-up questions
   - Update dependent artifacts
   - Continue from current position

### Skip Behavior

When user clicks [Skip]:

1. Mark question as skipped
2. AI notes the skip and may:
   - Ask the question again later with more context
   - Make a reasonable default assumption
   - Mark related artifacts as "[TBD]"

---

## Phase Flow

### Three-Phase Workflow Model

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   CPO Workflow      │ ───► │  Clarify Workflow   │ ───► │   CTO Workflow      │
│   (8 topics)        │      │   (Automatic)       │      │   (8 topics)        │
│                     │      │                     │      │                     │
│ • Problem statement │      │ • Code: Scan spec   │      │ • Tech stack        │
│ • Target users      │      │ • LLM: Categorize   │      │ • Data models →     │
│ • Core features     │      │ • User: Resolve     │      │   [Schema Gen]      │
│ • User flows        │      │ • Code: Apply       │      │ • API design →      │
│ • Priorities        │      │                     │      │   [API Gen]         │
│ • Success metrics   │      │                     │      │ • UI components →   │
│ • Competition       │      │                     │      │   [Component Gen]   │
│ • Constraints       │      │                     │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
        │                            │                            │
        ▼                            ▼                            ▼
  Business artifacts           Refined requirements         Technical artifacts
  (features, user stories)     (clarified specs)           (schemas, APIs, components)
```

**Key Difference from Agent Model:**
- Topics are predefined (workflow controls sequence)
- Question content is AI-generated within topic constraints (bounded LLM call)
- Generator workflows auto-invoke after relevant CTO topics

### Phase Transitions

#### CPO → Clarify (Automatic)

**Trigger:** CPO workflow completes all topic loops.

**Flow:**
1. CPO workflow shows summary (code step)
2. Summary displays captured data (features, user flows, priorities)
3. Highlights any gaps or [TBD] items
4. **Transitions to Clarify workflow automatically**
5. Clarify scans for ambiguities (code step)
6. LLM categorizes and generates questions
7. If ambiguities found → User resolves via question steps
8. If no ambiguities → Proceed to CTO workflow

**Summary Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│ CPO Phase Complete                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓ Product Vision Defined                                    │
│   "A project management tool for remote teams"              │
│                                                             │
│ ✓ Features Identified (5)                                   │
│   • User Authentication                                     │
│   • Project Dashboard                                       │
│   • Task Management                                         │
│   • Team Collaboration                                      │
│   • Notifications                                           │
│                                                             │
│ ✓ User Roles Defined (3)                                    │
│   • Admin, Project Manager, Team Member                     │
│                                                             │
│ ⚠ Open Items (2)                                            │
│   • Pricing tiers - skipped                                 │
│   • Mobile support - to be determined                       │
│                                                             │
│ Ready to define technical architecture?                     │
│                                                             │
│ [← Add More Details]              [Continue to CTO Phase →] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Clarify Workflow (Automatic)

**Trigger:** Automatically invoked as nested workflow when CPO completes

**Clarify Workflow Steps:**
1. **Scan** (Code step) - Rule-based detection:
   - Regex for vague words: "fast", "secure", "user-friendly"
   - Missing required fields check
   - Edge case pattern detection
2. **Categorize** (LLM step) - Sonnet assigns severity, generates clarifying questions
3. **Present** (Code step) - Display ambiguity summary to user
4. **Resolve Loop** (Loop step) - User answers or defers each ambiguity
5. **Apply** (Code step) - Update spec with resolutions

**Clarify Phase UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Clarify Phase                          Analyzing... ████░░░░│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ I found 3 areas that need clarification:                    │
│                                                             │
│ 🔴 High Priority                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ "Secure authentication" (in User Login)                 ││
│ │                                                         ││
│ │ What does "secure" mean specifically?                   ││
│ │                                                         ││
│ │ ○ OAuth 2.0 with MFA required                           ││
│ │ ○ Email/password with rate limiting                     ││
│ │ ○ Enterprise SSO (SAML/OIDC)                            ││
│ │ ○ Multiple options (user chooses)                       ││
│ │ ○ [Enter custom answer]                                 ││
│ │                                                         ││
│ │ [Answer]                                                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 🟡 Medium Priority (2 more)                          [Show] │
│                                                             │
│ [Defer All to CTO Phase]              [Answer All & Continue]│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Resolution Options:**
1. **Answer** - Provide clarification, updates feature spec
2. **Defer** - Move to CTO phase, marked as [TBD]
3. **Skip All** - Proceed directly to CTO phase

#### Clarify → CTO

**Trigger:** All clarifications answered or deferred

**Flow:**
1. Update feature specs with clarifications
2. Log deferred items for CTO phase
3. Transition to CTO Phase

### Phase Indicators

**Header shows current phase:**
```
[CPO] User Authentication - Question 8 of ~20
[CLARIFY] Resolving 3 ambiguities...
[CTO] User Authentication - Question 5 of ~15
```

**Color coding:**
- CPO Phase: Blue accent
- Clarify Phase: Orange accent
- CTO Phase: Green accent
- Complete: Gray

---

## Workflow State

### State Structure

Workflow state replaces conversation state. Each workflow maintains its own state that is checkpointed after each step.

```typescript
// Core workflow state (persisted to SQLite)
interface WorkflowState {
  sessionId: string;
  workflowId: 'cpo-phase' | 'clarify-phase' | 'cto-phase';
  currentStepId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';

  // Accumulated data from all steps
  data: Record<string, any>;

  // Topic tracking (for Q&A workflows)
  currentTopicIndex: number;
  currentQuestionIndex: number;
  topicQuestionCounts: Record<string, number>;

  // Answer tracking
  answers: Record<string, any>;    // questionId -> answer
  skippedQuestions: string[];
  editHistory: EditRecord[];

  // Clarify-specific state (when workflowId === 'clarify-phase')
  clarifyState: ClarifyState | null;

  // Step execution history (for debugging/rollback)
  history: StepExecution[];
  checkpoint: string;              // Last persisted state ID

  // Timestamps
  startedAt: string;
  lastActivityAt: string;
  pausedAt: string | null;
}

interface ClarifyState {
  ambiguities: Ambiguity[];
  resolvedCount: number;
  deferredCount: number;
  currentAmbiguityIndex: number;
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
  status: 'pending' | 'resolved' | 'deferred';
}

interface StepExecution {
  stepId: string;
  stepType: 'code' | 'llm' | 'question' | 'conditional' | 'loop' | 'nested_workflow';
  input: Record<string, any>;
  output: Record<string, any>;
  duration: number;
  timestamp: string;
  error?: string;
}

interface EditRecord {
  questionId: string;
  previousAnswer: any;
  newAnswer: any;
  editedAt: string;
  affectedSteps: string[];        // Step IDs that need re-execution
}
```

### State Persistence

**Where stored:** SQLite `workflow_checkpoints` table

**When persisted:**
- After each workflow step completes
- On pause (user-initiated or browser close)
- Before any nested workflow invocation
- Periodic auto-save (every 30 seconds)

**Checkpoint Recovery:**
- On failure, workflow can resume from last successful step
- Edit operations can rollback to previous checkpoint
- Full step history enables debugging

### Resumption

**On app restart:**
1. Check for active session in SQLite
2. If found, restore full state
3. Present: "Resume session?" dialog

**Resume Dialog:**
```
┌─────────────────────────────────────────────────────────────┐
│ Resume Previous Session?                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Feature: User Authentication                                │
│ Phase: CTO (Technical Design)                               │
│ Progress: 12 questions answered                             │
│ Last activity: 2 hours ago                                  │
│                                                             │
│ Pending question:                                           │
│ "What database will you use for user storage?"              │
│                                                             │
│ [Discard & Start Fresh]                    [Resume Session] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Re-evaluation on Edit

### When User Edits Artifact Directly

**Detection:** File watcher detects change to artifact file.

**Flow:**
1. Compare new content with AI's last known state
2. Identify what changed (diff)
3. AI evaluates impact:
   - Minor change (typo, formatting): No action
   - Significant change: May trigger questions

**Example:**

User edits `features/user-auth.yaml` to add a new acceptance criterion.

AI response:
```
┌─────────────────────────────────────────────────────────────┐
│ I noticed you added a new requirement:                      │
│ "Users can reset password via email"                        │
│                                                             │
│ Should I update the technical design to include:            │
│ • Password reset token entity in schema                     │
│ • POST /auth/reset-password endpoint                        │
│ • Password reset email template                             │
│                                                             │
│ [Yes, Update Design]              [No, I'll Handle It]      │
└─────────────────────────────────────────────────────────────┘
```

### When User Edits Previous Answer

**Flow:**
1. User clicks [Edit] on previous answer
2. Changes answer
3. AI reviews all answers that came after
4. AI may:
   - Invalidate dependent answers
   - Ask new questions
   - Update artifacts

**Example:**

User changes auth type from "Email + Password" to "OAuth Only".

AI response:
```
┌─────────────────────────────────────────────────────────────┐
│ You changed authentication to OAuth Only.                   │
│                                                             │
│ This affects:                                               │
│ • Q5: Password requirements (no longer applicable)          │
│ • Q7: Password reset flow (no longer applicable)            │
│                                                             │
│ I've removed these questions and will update the schema     │
│ to remove password-related fields.                          │
│                                                             │
│ New questions needed:                                       │
│ • Which OAuth scopes should be requested?                   │
│ • How to handle OAuth account linking?                      │
│                                                             │
│ [Continue with New Questions]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Question Estimation

### How "Question X of ~Y" Works

**Initial estimate:** AI estimates total questions based on:
- Feature complexity (from description)
- Phase (CPO ~15-20, CTO ~20-30)
- Similar past features (if available)

**Dynamic adjustment:**
- Increases when user answers reveal complexity
- Decreases when user skips or AI infers answers
- Shows "~" to indicate estimate

**Progress calculation:**
```
Progress % = (answered + skipped) / estimated_total
```

---

## Pause & Resume

### Pause Session

User can pause at any time:
- Click [Pause] button
- Close browser (auto-pause)
- Switch to different feature

**On pause:**
- Save full state to SQLite
- Mark session as paused
- Show "Paused" indicator

### Resume Options

When user returns to a paused feature:

1. **Exact resume** - Continue from pending question
2. **Review & resume** - Show summary, then continue
3. **Start fresh** - Discard session, begin new Q&A

---

## Error Handling

### AI Failure

If AI call fails:
1. Show error immediately
2. Save last good state
3. Offer retry button
4. Option to skip current question

### Invalid Answer

If user provides invalid input:
1. Show validation error inline
2. Don't submit to AI
3. User must fix or skip

### Session Corruption

If session state is corrupted:
1. Attempt to recover from last good checkpoint
2. If unrecoverable, offer to start fresh
3. Preserve any artifacts already generated

---

## Resolved Questions

**Should AI explain why it's asking each question?**
- **Decision:** Yes, implemented as F19 "Why This Question?" Explainers
- See: features-additional.md F19
- Expandable context shows connection, purpose, downstream impact, and examples
- Auto-expanded for technical questions, collapsed for simple yes/no

**Can users add their own questions for AI to answer?**
- **Decision:** Yes, via custom annotations and manual spec editing
- Users can add questions as annotations (F5) that AI will see in context
- Direct spec editing triggers re-evaluation where AI may ask clarifying questions
- Feature request workflow: Add to features.yaml, AI generates Q&A for that feature

**Should there be a "fast mode" with fewer questions?**
- **Decision:** No dedicated fast mode, but flexibility built-in
- Users can skip questions freely - AI adapts and makes reasonable defaults
- Question batching (F14) groups related questions to reduce perceived length
- Users can edit specs directly to bypass Q&A entirely (file-first approach)
- Rationale: Maintaining two Q&A modes doubles complexity; skip mechanism provides enough flexibility
