# Setup Phase Features

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

Features used during project initialization and configuration. These features help establish the foundation for your Foundry project before beginning the Q&A workflows.

**When to Use:** During first-run setup or when reconfiguring project settings.

---

## F6: Project Constitution

### Description

Optional governing principles document that guides all AI decision-making. Inspired by GitHub Spec-Kit's constitution concept.

### Requirements

**Content Areas:**
| Area | Purpose | Examples |
|------|---------|----------|
| Coding Standards | Naming, patterns, style | "snake_case for functions" |
| Security | Auth, validation, secrets | "All endpoints require JWT" |
| UX Patterns | Consistency, accessibility | "Show skeleton screens" |
| Tech Constraints | Libraries, versions | "Use date-fns, not moment" |

**Behavior:**
- AI agents reference constitution for all artifact generation
- Optional - projects function without one
- User can create/edit at any time
- Versioned with project

### File Schema

**Location:** `.foundry/constitution.yaml`

```yaml
version: "1.0"
createdAt: "2025-01-15T10:00:00Z"
updatedAt: "2025-01-15T14:30:00Z"

principles:
  - "User data privacy is paramount"
  - "Fail fast, fail gracefully"
  - "Accessibility is not optional"

coding:
  naming:
    functions: "snake_case"
    classes: "PascalCase"
    database_tables: "snake_case_singular"
  style:
    max_function_length: 50
    require_docstrings: true

security:
  authentication: "JWT with refresh tokens"
  authorization: "Role-based access control"
  input_validation: "Sanitize all user input at API boundary"
  secrets: "Environment variables only, never hardcode"

ux:
  error_format: "Include: what went wrong, why, how to fix"
  loading_states: "Skeleton screens, not spinners"
  accessibility: "WCAG 2.1 AA compliance"

constraints:
  allowed_libraries:
    - "axios"
    - "lodash"
    - "date-fns"
  forbidden_libraries:
    - "moment.js"
    - "jquery"
  node_version: ">=20.0.0"

hooks:
  onFeatureSave:
    - action: validateSchema
    - action: updateChecklist
  onSchemaChange:
    - action: regenerateAPIs
  preCommit:
    - action: runAnalyzer
```

### UX Design

**Access:** Settings panel → Constitution tab

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Project Constitution                              [+ Create] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠ No constitution defined                                   │
│                                                             │
│ A constitution helps AI generate consistent artifacts       │
│ by defining coding standards, security rules, and patterns. │
│                                                             │
│ [Create from Template]        [Create Empty]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Decision Reference

See: [decisions.md](../decisions.md) D16 (Constitution - Optional)

---

## F12: Agent Hooks

### Description

Event-driven automations triggered by file changes. Inspired by AWS Kiro's hook system.

### Requirements

**Supported Events:**
| Event | Trigger |
|-------|---------|
| `onFeatureSave` | Feature file saved |
| `onSchemaChange` | DBML schema modified |
| `onAPIChange` | OpenAPI/GraphQL modified |
| `onComponentChange` | HTML component modified |
| `preCommit` | Before git commit |

**Available Actions:**
| Action | Description |
|--------|-------------|
| `validateSchema` | Run DBML/OpenAPI/GraphQL validation |
| `updateChecklist` | Regenerate checklist from criteria |
| `regenerateAPIs` | Update API refs after schema change |
| `runAnalyzer` | Execute consistency analyzer |
| `updateProgress` | Recalculate task progress |

### Configuration

**Defined in constitution.yaml:**
```yaml
hooks:
  onFeatureSave:
    - action: validateSchema
    - action: updateChecklist
    - action: updateProgress

  onSchemaChange:
    - action: regenerateAPIs
      options:
        updateFeatureRefs: true

  preCommit:
    - action: runAnalyzer
      options:
        failOnError: true
        failOnWarning: false
```

### UX Design

**Hook Execution Feedback:**
```
┌─────────────────────────────────────────────────────────────┐
│ Hook: onFeatureSave                                         │
├─────────────────────────────────────────────────────────────┤
│ ✓ validateSchema - Passed                                   │
│ ✓ updateChecklist - 3 items regenerated                     │
│                                                             │
│ All hooks completed successfully                            │
└─────────────────────────────────────────────────────────────┘
```

**Hook Failure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Hook: preCommit                                             │
├─────────────────────────────────────────────────────────────┤
│ ✗ runAnalyzer - Failed                                      │
│   Found 1 error that must be resolved before commit         │
│                                                             │
│   Error: Missing foreign key index on orders.user_id        │
│   → schemas/schema.dbml:45                                  │
│                                                             │
│ [Fix Issue]                                [Force Commit]   │
└─────────────────────────────────────────────────────────────┘
```

### Technical Approach

**Hook Execution:**
```typescript
interface HookConfig {
  event: HookEvent;
  actions: HookAction[];
}

interface HookAction {
  action: ActionType;
  options?: Record<string, any>;
}

type HookEvent =
  | 'onFeatureSave'
  | 'onSchemaChange'
  | 'onAPIChange'
  | 'onComponentChange'
  | 'preCommit';

type ActionType =
  | 'validateSchema'
  | 'updateChecklist'
  | 'regenerateAPIs'
  | 'runAnalyzer'
  | 'updateProgress';

async function executeHooks(
  event: HookEvent,
  context: HookContext
): Promise<HookResult[]> {
  const hooks = getHooksForEvent(event);
  const results: HookResult[] = [];

  for (const hook of hooks) {
    const result = await executeAction(hook.action, hook.options, context);
    results.push(result);

    if (!result.success && hook.options?.failOnError) {
      break;
    }
  }

  return results;
}
```

### Decision Reference

See: [decisions.md](../decisions.md) D20 (Agent Hooks - Event-driven)

---

## API Key Setup

### Description

Configuration flow for providing Anthropic API key when not set via environment variable.

### Behavior

**Priority order:**
1. Check for `ANTHROPIC_API_KEY` environment variable
2. If not found, prompt user interactively
3. Store prompted key in `~/.foundry/credentials`
4. Supports both developer UX and CI automation

### UI Design

If `ANTHROPIC_API_KEY` not in environment:

```
┌─────────────────────────────────────────────────────────────┐
│ API Key Required                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Foundry uses Claude AI to build specifications.             │
│ Enter your Anthropic API key to continue.                   │
│                                                             │
│ API Key:                                                    │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ sk-ant-api03-...                                        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ☑ Save to ~/.foundry/credentials (recommended)             │
│                                                             │
│ Get an API key: https://console.anthropic.com              │
│                                                             │
│                                              [Continue]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Decision Reference

See: [decisions.md](../decisions.md) D13 (API Authentication)

---

## Dependencies

- **F6 (Constitution)** is referenced by:
  - [F9: Enhanced Analyzer](features-management.md#f9-enhanced-consistency-analyzer) - Constitution compliance checks
  - F12 (Agent Hooks) - Hook definitions in constitution.yaml
  - [F16: AI Recommendation Badges](features-qa.md#f16-ai-recommendation-badges) - Constitution preference matching

- **F12 (Agent Hooks)** uses:
  - [F2: Validation Engine](features-management.md#f2-validation-engine) - validateSchema action
  - [F9: Enhanced Analyzer](features-management.md#f9-enhanced-consistency-analyzer) - runAnalyzer action

- **API Key Setup** required for:
  - All AI-driven features and workflows
