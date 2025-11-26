# Spec-Driven Development Research

**Status:** Complete
**Last Updated:** 2025-11-25

## Overview

Research into spec-driven development (SDD) methodology and tools to inform Foundry's design decisions. This document compares approaches from GitHub Spec-Kit, AWS Kiro, Tessl, and JetBrains Junie.

---

## What is Spec-Driven Development?

SDD is a methodology where specifications are created before code using AI, with the spec serving as the source of truth.

### Implementation Levels

| Level | Description | Code Editable? | Maturity |
|-------|-------------|----------------|----------|
| **Spec-first** | Spec precedes AI development | Yes | Proven |
| **Spec-anchored** | Spec persists for evolution | Yes | Emerging |
| **Spec-as-source** | Spec is primary artifact | No | Experimental |

**Recommendation for Foundry:** Aim for **spec-anchored** - maintain specs alongside artifacts for long-term evolution.

---

## Tool Comparison

### GitHub Spec-Kit

| Aspect | Details |
|--------|---------|
| **Approach** | CLI + slash commands |
| **Distribution** | npm/uv package |
| **Agent Support** | 15+ (Claude, Copilot, Gemini, Cursor, etc.) |
| **File Format** | Markdown |

**Workflow:**
```
Constitution → Specify → Clarify → Plan → Tasks → Implement
```

**Key Commands:**
- `/speckit.constitution` - Governing principles
- `/speckit.specify` - Requirements
- `/speckit.plan` - Technical design
- `/speckit.tasks` - Task breakdown
- `/speckit.clarify` - Ambiguity resolution
- `/speckit.analyze` - Consistency validation
- `/speckit.checklist` - Quality gates

**Strengths:**
- Agent-agnostic (works with any AI)
- Constitution document for consistency
- Branch-per-specification workflow
- Open source

**Weaknesses:**
- Verbose documentation output
- Tedious review process
- Better for large features than small fixes

### AWS Kiro

| Aspect | Details |
|--------|---------|
| **Approach** | Full IDE (Code OSS base) |
| **Distribution** | Standalone application |
| **Agent Support** | Built-in Claude |
| **File Format** | Markdown (EARS syntax) |

**Workflow:**
```
Requirements → Design → Tasks
```

**Key Features:**
- **Agent Hooks**: on-save, pre-commit automations
- **EARS Syntax**: WHEN/THEN testable requirements
- **Checkpointing**: Save/resume progress
- **CLI Mode**: Terminal-based agent

**Unique:**
- Not AWS-specific (any cloud/stack)
- Event-driven automations
- Property-based testing for specs

### Tessl Framework

| Aspect | Details |
|--------|---------|
| **Approach** | CLI + workspace config |
| **Status** | Private beta |
| **File Format** | Natural language with @tags |

**Key Features:**
- `@generate` tags for code points
- `@test` tags for test specs
- Bidirectional spec-code sync
- Generated files marked "DO NOT EDIT"

**Most Advanced:** Closest to true "spec-as-source" but faces LLM non-determinism challenges.

### JetBrains Junie

| Aspect | Details |
|--------|---------|
| **Approach** | IDE plugin |
| **Integration** | JetBrains products |
| **File Format** | Markdown |

**Workflow:**
```
requirements.md → plan.md → tasks.md
```

**Key Features:**
- "Think More" mode for deeper reasoning
- Tight IDE integration
- Small, scoped patches

---

## Key Concepts Evaluated

### Constitution Document

**What:** Immutable principles guiding all AI decisions.

**Value for Foundry:**
- Reduces inconsistency across generated artifacts
- Enforces coding standards without repeated prompting
- User-defined rules respected by all agents

**Decision:** Adopt as optional feature (F6)

### EARS Syntax

**What:** Easy Approach to Requirements Syntax (Rolls Royce)

**Patterns:**
| Type | Template |
|------|----------|
| Ubiquitous | The system SHALL [action] |
| Event-driven | WHEN [event] the system SHALL [action] |
| State-driven | WHILE [state] the system SHALL [action] |
| Conditional | IF [condition] THEN the system SHALL [action] |

**Value for Foundry:**
- Makes acceptance criteria testable
- Clear, unambiguous language
- Can auto-generate test cases

**Decision:** Document as best practice in Q&A guidance

### Agent Hooks

**What:** Event-driven automations triggered by file changes.

**Events:**
- `onSave` - File saved
- `onCreate` - File created
- `onDelete` - File deleted
- `preCommit` - Before git commit

**Value for Foundry:**
- Automates validation on save
- Updates checklists automatically
- Runs analyzer before commit

**Decision:** Adopt as feature (F12)

### Lessons Learned File

**What:** Feedback loop document logging corrected errors.

**Benefit:** AI checks before generating, reducing repeated mistakes.

**Decision:** Adopt as feature (F11)

### Clarify Phase

**What:** Explicit phase to surface and resolve ambiguities before technical design.

**Value for Foundry:**
- Catches vague language early
- Reduces CTO phase rework
- Forces clarity on edge cases

**Decision:** Adopt as automatic phase (F7)

---

## Challenges & Pitfalls

### 1. AI Doesn't Follow All Instructions

Despite large context windows, AI agents frequently miss instructions or over-interpret directives.

**Mitigation:**
- Verify outputs at each phase
- Use hooks for automated validation
- Keep critical rules prominent

### 2. Verbose Documentation Burden

Spec-kit creates extensive markdown that's tedious to review.

**Mitigation:**
- Use structured YAML (not pure markdown)
- Auto-collapse details in UI
- Focus on what's different

### 3. Workflow-Problem Mismatch

Elaborate processes for small bugs create overhead.

**Mitigation:**
- Scale process to problem size
- Quick mode for minor changes
- Full SDD for large features

### 4. Non-Deterministic Generation

Same spec can produce different code each time.

**Mitigation:**
- Avoid "spec-as-source" promises
- Use spec-anchored approach
- Allow human code edits

### 5. Model-Driven Development Parallel

Historical MDD promised code from specs but proved inflexible.

**Risk:** Combining MDD constraints with LLM non-determinism.

**Mitigation:**
- Keep specs as guidance, not strict source
- Human oversight remains essential
- Iterative refinement over one-shot generation

---

## Recommendations for Foundry

### Adopt

| Feature | Source | Rationale |
|---------|--------|-----------|
| Constitution | Spec-Kit | Reduces inconsistency |
| Clarify Phase | Spec-Kit | Catches ambiguities early |
| Agent Hooks | Kiro | Automates validation |
| Lessons Learned | Red Hat Guide | Feedback loop |
| Task Breakdown | All tools | Trackable progress |
| Implementation Checklist | Spec-Kit | Quality gates |

### Adapt

| Concept | Original | Foundry Approach |
|---------|----------|------------------|
| Phase workflow | 5+ phases | 3 phases (CPO → Clarify → CTO) |
| Task UI | Separate view | Feature-integrated |
| File format | Markdown | YAML (structured) |
| Validation | Manual command | Automatic on-change |

### Skip

| Feature | Reason |
|---------|--------|
| Multi-agent support | Stay focused on Claude quality |
| Spec-as-source | LLM non-determinism makes this unreliable |
| Branch-per-spec | Overkill for local tool |
| Markdown specs | YAML better for structured data |

---

## Competitive Differentiation

### What Makes Foundry Different

1. **Visual-First**: Diagrams and UI gallery vs text-only specs
2. **Two-Phase Split**: Explicit CPO/CTO separation
3. **Reverse Engineering**: Analyze existing codebases
4. **Integrated Validation**: Real-time visual feedback
5. **Git-Native**: Designed around Git from start

### Unique Value Proposition

> "Foundry is the only spec tool that visualizes your architecture while building it, and can reverse-engineer existing codebases into structured specifications."

---

## Sources

- [GitHub Spec-Kit](https://github.com/github/spec-kit)
- [GitHub Blog: SDD with AI](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [GitHub Blog: Markdown as Code](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-using-markdown-as-a-programming-language-when-building-with-ai/)
- [Martin Fowler: SDD Tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [AWS Kiro](https://kiro.dev/)
- [InfoQ: AWS Kiro](https://www.infoq.com/news/2025/08/aws-kiro-spec-driven-agent/)
- [JetBrains Junie](https://blog.jetbrains.com/junie/2025/10/how-to-use-a-spec-driven-approach-for-coding-with-ai/)
- [Red Hat: AI Coding Quality](https://developers.redhat.com/articles/2025/10/22/how-spec-driven-development-improves-ai-coding-quality)
