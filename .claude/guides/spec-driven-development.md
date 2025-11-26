# Spec-Driven Development (SDD) Guide

A comprehensive guide to spec-driven development methodology for AI-assisted software engineering.

## What is Spec-Driven Development?

Spec-Driven Development (SDD) is a methodology where specifications are created before code using AI, with the spec serving as the source of truth. Instead of "code first, document later," SDD inverts the process: specifications drive implementation decisions.

### Key Philosophy

> "Maintaining software means evolving specifications. The lingua franca of development moves to a higher level, and code is the last-mile approach." — GitHub Blog

**Traditional Development:** Code → Documentation → Maintenance chaos

**Spec-Driven Development:** Specification → AI-generated code → Specification updates

### Implementation Levels

| Level | Description | Human Edits |
|-------|-------------|-------------|
| **Spec-first** | Spec written before AI development | Code editable |
| **Spec-anchored** | Spec persists post-completion for evolution | Code editable |
| **Spec-as-source** | Spec is primary artifact | Code untouched by humans |

Most teams should aim for **spec-anchored** - maintaining specs alongside code for long-term evolution.

---

## The SDD Workflow

### Phase 1: Specify

Define WHAT needs to be built, not HOW.

**Focus on:**
- User journeys and experiences
- Problems being solved
- Success metrics
- Who will use it

**Format:** User stories with acceptance criteria

```markdown
## Feature: User Login

**As a** registered user
**I want to** log in with email and password
**So that** I can access my account

### Acceptance Criteria
- WHEN user enters valid credentials THEN redirect to dashboard
- WHEN user enters invalid credentials THEN show error message
- WHEN user attempts 5 failed logins THEN lock account for 15 minutes
```

### Phase 2: Clarify

Surface and resolve ambiguities BEFORE technical design.

**Check for:**
- Vague language ("fast", "user-friendly", "secure")
- Missing edge cases
- Ambiguous flows
- Potential conflicts between features

**Example clarification:**
```
❓ "User-friendly error messages"
→ Clarified: "Error messages must include: 1) What went wrong, 2) Why, 3) How to fix it"
```

### Phase 3: Plan

Create technical architecture - HOW to build it.

**Include:**
- Tech stack choices with rationale
- Component architecture
- Data models
- API design
- Testing strategy

### Phase 4: Tasks

Break work into reviewable, testable units.

**Task properties:**
- Title (what to do)
- Complexity (low/medium/high)
- Dependencies (what must complete first)
- Acceptance criteria (how to verify)

### Phase 5: Implement

Execute tasks with AI assistance.

**Key principle:** Verify at each phase before proceeding.

---

## Major SDD Tools Comparison

### GitHub Spec-Kit

**Approach:** CLI-distributed, agent-agnostic

**Workflow:** Constitution → Specify → Plan → Tasks → Implement

**Key Commands:**
- `/speckit.constitution` - Establish governing principles
- `/speckit.specify` - Define requirements
- `/speckit.plan` - Create technical architecture
- `/speckit.tasks` - Generate task breakdown
- `/speckit.clarify` - Resolve ambiguities
- `/speckit.analyze` - Validate consistency

**Unique Features:**
- Works with 15+ AI agents (Claude, Copilot, Gemini, etc.)
- Constitution document for immutable principles
- Creates branches per specification

**Limitations:**
- Verbose documentation can be tedious to review
- Better suited for larger features than small fixes

### AWS Kiro

**Approach:** Full IDE (based on Code OSS)

**Workflow:** Requirements → Design → Tasks

**Key Features:**
- **Agent Hooks**: Event-driven automations (on-save, pre-commit)
- **EARS Syntax**: WHEN/THEN structure for testable requirements
- **Checkpointing**: Save and resume progress
- **CLI Agent**: Terminal-based development

**Example EARS requirement:**
```
WHEN user enters invalid credentials
THEN the system SHALL display error message within 200ms
```

**Unique:** Not AWS-specific - works with any cloud/stack

### Tessl Framework

**Approach:** CLI creating workspace configurations

**Workflow:** Natural language specs with tagged elements

**Key Features:**
- `@generate` tags for code generation points
- `@test` tags for test specifications
- Bidirectional sync between spec and code
- Generated files marked "DO NOT EDIT"

**Status:** Most advanced "spec-as-source" approach, still in beta

### JetBrains Junie

**Approach:** IDE plugin for JetBrains products

**Workflow:** requirements.md → plan.md → tasks.md

**Key Features:**
- "Think More" mode for deeper reasoning
- Tight IDE integration
- Small, scoped patches vs. large changes

---

## Key Concepts

### Constitution Document

A governance file containing immutable principles that guide all AI decisions.

**Example structure:**
```yaml
# constitution.yaml

coding_standards:
  naming: "snake_case for functions, PascalCase for classes"
  max_function_length: 50
  require_docstrings: true

security:
  auth: "All endpoints require JWT authentication"
  input_validation: "Sanitize all user input"
  secrets: "Never hardcode - use environment variables"

ux_patterns:
  error_format: "Include what, why, and how-to-fix"
  loading_states: "Show skeleton screens, not spinners"
  accessibility: "WCAG 2.1 AA compliance required"

tech_constraints:
  allowed_libs: ["axios", "lodash", "date-fns"]
  forbidden_libs: ["moment.js", "jquery"]
  node_version: ">=20.0.0"
```

### EARS Syntax

Easy Approach to Requirements Syntax - developed at Rolls Royce.

**Patterns:**

| Pattern | Structure | Example |
|---------|-----------|---------|
| Ubiquitous | The system SHALL [action] | The system SHALL encrypt passwords |
| Event-driven | WHEN [event] the system SHALL [action] | WHEN user clicks login THEN redirect |
| State-driven | WHILE [state] the system SHALL [action] | WHILE offline, cache user input |
| Conditional | IF [condition] THEN the system SHALL | IF admin THEN show delete button |

### Agent Hooks

Event-driven automations triggered by file changes.

**Supported events:**
- `onSave` - File saved
- `onCreate` - File created
- `onDelete` - File deleted
- `preCommit` - Before git commit

**Example configuration:**
```yaml
hooks:
  onSave:
    pattern: "**/*.tsx"
    actions:
      - validateTypes
      - updateTests

  preCommit:
    actions:
      - runAnalyzer
      - checkSecrets
```

### Lessons Learned File

A feedback loop document where corrected errors are logged.

**Purpose:** AI checks this before generating similar artifacts, reducing repeated mistakes.

**Format:**
```markdown
# Lessons Learned

## 2025-01-15: API Error Format
**Error**: Generated endpoint returned `{error: "message"}`
**Fix**: Changed to `{code: "ERR_001", message: "...", details: {...}}`
**Rule**: All errors must follow ErrorResponse schema

## 2025-01-14: Database Naming
**Error**: Created table `Users` (PascalCase)
**Fix**: Renamed to `users` (snake_case)
**Rule**: All database tables use snake_case, singular form
```

---

## Best Practices

### 1. Structure Specs Modularly

Break large specs into sections that can compile independently.

```
specs/
├── auth/
│   ├── login.md
│   ├── register.md
│   └── password-reset.md
├── dashboard/
│   └── overview.md
└── shared/
    └── error-handling.md
```

### 2. Use Bounded Phases

Don't request everything at once. Guide AI through small, scoped patches.

**Bad:** "Build the entire authentication system"

**Good:**
1. "Create the User entity schema"
2. "Build the login API endpoint"
3. "Create the login form component"

### 3. Verify at Each Phase

Before proceeding:
- Does the specification truly capture intent?
- Does the plan address real-world constraints?
- Has the AI overlooked edge cases?

### 4. Keep Specs Focused

Avoid overlap between spec files. Multiple "how" specs can work together (architecture, documentation, testing, security), but each should be tightly scoped.

### 5. Maintain the Feedback Loop

Log errors and fixes in lessons learned. This compounds over time:
- Week 1: AI makes 10 errors
- Week 4: AI makes 3 errors (learned from previous fixes)

---

## Common Pitfalls

### 1. Over-Documentation

**Problem:** Spec-kit and similar tools can generate verbose, repetitive files.

**Solution:**
- Review critically - not all generated docs add value
- Prune unnecessary sections
- Focus on what's different, not what's obvious

### 2. Rigid Workflow for All Problems

**Problem:** Using elaborate spec process for minor bug fixes.

**Solution:**
- Scale process to problem size
- Quick fixes: Just write the code
- Medium features: Basic spec + implement
- Large features: Full SDD workflow

### 3. Spec-as-Source Promises

**Problem:** Expecting AI to always generate the same code from the same spec.

**Reality:** LLM non-determinism means outputs vary. This makes "never edit generated code" impractical.

**Solution:** Use spec-anchored approach - maintain both spec and code, keeping them synchronized.

### 4. Ignoring Agent Limitations

**Problem:** Assuming AI will follow all instructions in large context windows.

**Reality:** AI agents frequently miss instructions, even with comprehensive specs.

**Solution:**
- Verify outputs
- Use agent hooks for automated checks
- Keep critical instructions prominent

---

## Templates

### Feature Specification Template

```markdown
# Feature: [Name]

## Overview
[1-2 sentence description]

## User Story
**As a** [user type]
**I want to** [goal]
**So that** [benefit]

## Acceptance Criteria
- WHEN [trigger] THEN [expected behavior]
- WHEN [trigger] THEN [expected behavior]

## Technical Notes
[Any technical constraints or considerations]

## Dependencies
- [Feature/component this depends on]

## Open Questions
- [ ] [Question that needs clarification]
```

### Constitution Template

```yaml
# constitution.yaml
version: "1.0"

principles:
  - "User data privacy is paramount"
  - "Fail fast, fail gracefully"
  - "Accessibility is not optional"

coding_standards:
  language: "TypeScript"
  style_guide: "Airbnb"
  max_complexity: 10

security:
  authentication: "JWT with refresh tokens"
  authorization: "Role-based access control"
  data_handling: "Encrypt PII at rest and in transit"

testing:
  coverage_minimum: 80
  required_tests: ["unit", "integration", "e2e"]
```

### Lessons Learned Template

```markdown
# Lessons Learned

## [DATE]: [Brief Title]

**Context**: [What was being built]
**Error**: [What went wrong]
**Fix**: [How it was corrected]
**Rule**: [Generalized rule to prevent recurrence]

---
```

---

## Further Reading

- [GitHub Blog: Spec-Driven Development with AI](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [Martin Fowler: Exploring SDD Tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [AWS Kiro Documentation](https://kiro.dev/)
- [Red Hat: AI Coding Quality](https://developers.redhat.com/articles/2025/10/22/how-spec-driven-development-improves-ai-coding-quality)
- [JetBrains Junie: Spec-Driven Approach](https://blog.jetbrains.com/junie/2025/10/how-to-use-a-spec-driven-approach-for-coding-with-ai/)
