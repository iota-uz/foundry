# Maintenance Phase Features

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

Features for keeping specifications aligned with evolving codebase. These features support long-term spec-code synchronization and continuous improvement.

**When to Use:** Periodic sync operations after code changes, ongoing feedback loop maintenance.

---

## Continuous Improvement

### F11: Lessons Learned File

#### Description

AI-maintained feedback loop document that logs corrected errors and patterns. AI checks this before generating similar artifacts.

#### Requirements

**Maintenance:**
- AI logs errors when user corrects generated artifacts
- AI checks lessons before generating similar content
- User can add manual entries
- Entries never auto-deleted

**Entry Structure:**
- Date and brief title
- Error description
- Fix applied
- Generalized rule

#### File Schema

**Location:** `.foundry/lessons-learned.md`

```markdown
# Lessons Learned

This file is maintained by AI and tracks corrected errors to prevent recurrence.

---

## 2025-01-15: API Error Format

**Context**: Generating login endpoint response
**Error**: Generated endpoint returned `{error: "message"}`
**Fix**: Changed to `{code: "ERR_001", message: "...", details: {...}}`
**Rule**: All errors must follow ErrorResponse schema from constitution

---

## 2025-01-14: Database Naming Convention

**Context**: Creating users table
**Error**: Created table `Users` (PascalCase)
**Fix**: Renamed to `users` (snake_case, singular)
**Rule**: All database tables use snake_case singular form

---

## 2025-01-12: Missing Input Validation

**Context**: User registration endpoint
**Error**: No email format validation
**Fix**: Added email regex validation at API boundary
**Rule**: All user input must be validated before processing

---
```

#### UX Design

**Access:** Settings → Lessons Learned

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Lessons Learned                              [+ Add Entry]   │
├─────────────────────────────────────────────────────────────┤
│ 3 entries • Last updated: Today                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Jan 15: API Error Format                                    │
│ All errors must follow ErrorResponse schema                 │
│                                                         [▼] │
│                                                             │
│ Jan 14: Database Naming Convention                          │
│ All database tables use snake_case singular form            │
│                                                         [▼] │
│                                                             │
│ Jan 12: Missing Input Validation                            │
│ All user input must be validated before processing          │
│                                                         [▼] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Decision Reference

See: [decisions.md](../decisions.md) D19 (Lessons Learned - AI-maintained)

---

## Spec-Code Synchronization

### F13: Actualize (Spec-Code Sync)

#### Description

Sync specifications with the current codebase state. Detects drift between what's documented in specs and what's actually implemented in code, then offers to update specs accordingly.

#### Requirements

**Use Cases:**
- Code evolved without updating specs
- After major refactoring
- Onboarding to existing project with outdated specs
- Periodic spec maintenance

**Detection Types:**
| Type | Description |
|------|-------------|
| Spec → Code | Features in spec that are modified/removed in code |
| Code → Spec | Features in code that aren't documented in spec |
| Schema Drift | Database schema differences |
| API Drift | Endpoint/operation differences |

**Modes:**
| Mode | Description |
|------|-------------|
| `detect` | Analyze and report drift (no changes) |
| `preview` | Show proposed changes before applying |
| `apply` | Apply changes to specs (with undo) |

#### Model Selection

**Uses Opus model** - This task requires deep reasoning to:
- Compare abstract spec descriptions with concrete code
- Understand semantic equivalence (not just text matching)
- Identify features in code that span multiple files
- Determine if code changes are intentional divergence or spec drift

#### File Schema

**Drift Report (stored in SQLite):**
```typescript
interface DriftReport {
  id: string;
  createdAt: string;
  scope: 'project' | 'module' | 'feature';
  targetId?: string;

  specToCode: {
    featureId: string;
    featureName: string;
    type: 'modified' | 'removed' | 'not_implemented';
    details: string;
    codeEvidence: {
      files: string[];
      snippet?: string;
    };
    suggestedAction: 'update_spec' | 'keep_spec' | 'remove_spec';
    confidence: 'high' | 'medium' | 'low';
  }[];

  codeToSpec: {
    suggestedName: string;
    description: string;
    implementationFiles: { path: string; description: string }[];
    suggestedModule: string;
    confidence: 'high' | 'medium' | 'low';
  }[];

  schemaDrift: {
    entity: string;
    type: 'added' | 'removed' | 'modified';
    specDefinition: any;
    codeDefinition: any;
    sourceFile: string;
  }[];

  apiDrift: {
    endpoint: string;
    type: 'added' | 'removed' | 'modified';
    specDefinition: any;
    codeDefinition: any;
    sourceFile: string;
  }[];

  summary: {
    totalItems: number;
    requiresAction: number;
    autoFixable: number;
  };

  tokensUsed: number;
}
```

#### UX Design

**Trigger:**
- Button in project header: "Actualize Specs"
- Menu: Project → Sync with Codebase
- CLI: `foundry actualize`

**Actualize Wizard:**
```
┌─────────────────────────────────────────────────────────────┐
│ Actualize Specs                                    Step 1/3 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Scope:                                                      │
│ ○ Entire Project                                            │
│ ○ Specific Module: [Auth ▼]                                 │
│ ○ Specific Feature: [User Login ▼]                          │
│                                                             │
│ Options:                                                    │
│ ☑ Detect new features in code                               │
│ ☑ Detect removed/changed features                           │
│ ☑ Include schema drift                                      │
│ ☑ Include API drift                                         │
│ ☐ Auto-mark synced features as implemented                  │
│                                                             │
│ ⚠ This uses the Opus model and may take 2-5 minutes         │
│   for large codebases.                                      │
│                                                             │
│ [Cancel]                                   [Start Analysis] │
└─────────────────────────────────────────────────────────────┘
```

**Analysis Progress:**
```
┌─────────────────────────────────────────────────────────────┐
│ Analyzing Codebase...                              [Cancel] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ████████████░░░░░░░░ 60%                                    │
│                                                             │
│ ✓ Scanning project structure                                │
│ ✓ Analyzing Auth module (5 features)                        │
│ ◐ Analyzing Payments module (3 features)...                 │
│ ○ Comparing schema definitions                              │
│ ○ Comparing API endpoints                                   │
│                                                             │
│ Files analyzed: 127/213                                     │
│ Estimated time remaining: 2 min                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Drift Results:**
```
┌─────────────────────────────────────────────────────────────┐
│ Drift Detected                                     12 items │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠ Features Modified in Code (3)                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ User Login                                              ││
│ │ Spec says: "Email + password authentication"            ││
│ │ Code has: OAuth added (Google, GitHub)                  ││
│ │ Files: src/auth/login.ts, src/auth/oauth.ts             ││
│ │                                                         ││
│ │ ○ Update spec (add OAuth)  ○ Keep spec  ○ Ignore        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ✚ New Features in Code (2)                                  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Two-Factor Authentication                               ││
│ │ Found in: src/auth/2fa.ts, src/auth/totp.ts             ││
│ │ Suggested module: Auth                                  ││
│ │                                                         ││
│ │ ○ Add to specs  ○ Ignore                                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 🗃 Schema Drift (4)                                          │
│ ├─ users: added `oauth_provider` column                     │
│ ├─ users: added `oauth_id` column                           │
│ └─ [Show all...]                                            │
│                                                             │
│ 🔌 API Drift (3)                                             │
│ ├─ GET /auth/oauth/google - New endpoint                    │
│ ├─ POST /auth/2fa/setup - New endpoint                      │
│ └─ [Show all...]                                            │
│                                                             │
│ [Export Report]    [Apply Selected (7)]    [Apply All (12)] │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Approach

**Analysis Flow:**
1. Load all spec files for scope
2. Use Opus to analyze codebase (via CodeAnalysis tool)
3. Compare spec features with code features
4. Identify schema/API differences
5. Generate drift report
6. Present to user for review
7. Apply selected changes with undo support

**Feature Matching:**
- Match by feature name (fuzzy)
- Match by implementation files (if populated)
- Match by API endpoints referenced
- Match by schema entities referenced

**Handling Large Codebases:**
- Chunk analysis by module
- Stream progress updates
- Cache intermediate results
- Allow resume if interrupted

#### Decision Reference

See: [tools.md](../tools.md) (AI Model Selection - Opus for actualize)

---

## Version Control

### Git Integration

#### Description

Embedded Git operations within the Foundry UI for committing, pushing, and pulling spec changes without leaving the application.

#### Requirements

**Supported Operations:**
- View current branch and status
- See changed files
- Commit with message
- Pull changes from remote
- Push changes to remote
- Branch indicator with ahead/behind counts

**UI Location:**
- Collapsible Git panel in sidebar
- Branch indicator in header
- Quick access via header dropdown

#### UX Design

**Git Panel (Collapsible):**

```
┌─────────────────────────────────────────────────────────────┐
│ Git                                                    [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Branch: main ▼              ↑ 0  ↓ 0                      │
│                                                             │
│  Changes (3)                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ M  .foundry/features/user-login.yaml                    ││
│  │ A  .foundry/components/pages/checkout.html              ││
│  │ M  .foundry/schemas/schema.dbml                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Commit message:                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Add checkout page and update schema                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Commit]  [Pull]  [Push]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Header Branch Indicator:**
```
│  Logo   │ Project: My SaaS App ▼  │  ⌘K Search  │  ↩ Undo │  Git: main │
```

#### Technical Approach

**Git Library:**
- Use `simple-git` npm package for Node.js Git operations
- Wrap in API endpoints for security
- Handle authentication via SSH keys or tokens

**State Management:**
- Poll for Git status every 30 seconds when panel open
- Invalidate on file changes
- Cache branch list for dropdown

**File Watching Integration:**
- Monitor `.foundry/` directory for changes
- Update Git status indicator
- Show unsaved changes in UI

#### Safety Features

**Pre-commit Validation:**
- Run validation engine before allowing commit
- Warn if errors exist
- Allow force commit with confirmation

**Conflict Handling:**
- Detect merge conflicts on pull
- Show conflict UI with file list
- Provide link to external Git tool for complex conflicts

---

## Dependencies

- **F13 (Actualize)** uses CodeAnalysis tool with Opus model for deep code reasoning
- **F13 (Actualize)** integrates with reverse engineering capabilities from [../research/reverse-engineering.md](../research/reverse-engineering.md)
- **F11 (Lessons Learned)** integrates with all AI generation workflows (CPO, CTO, Schema, API, Component generators)
- **Git Integration** uses validation engine ([F2](features-management.md#f2-validation-engine)) for pre-commit checks
- **Git Integration** uses file system watching from [../research/file-system-sync.md](../research/file-system-sync.md)
