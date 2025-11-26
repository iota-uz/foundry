# Management Phase Features

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

Features for reviewing, refining, and validating generated specifications. These features help maintain quality and consistency after Q&A workflows complete.

**When to Use:** After Q&A workflows complete, during ongoing spec editing and refinement.

---

## Discovery & Navigation

### F1: Global Search

#### Description

Simple text search across all spec content to quickly find features, entities, endpoints, and components.

#### Requirements

**Functional:**
- Search all text content in `.foundry/` directory
- Return results grouped by type (feature, entity, endpoint, component)
- Highlight matching text in results
- Click result to navigate to artifact

**Scope:**
- Features (name, description, implementation plan)
- Schema entities (table names, field names)
- API endpoints (paths, operation names)
- UI components (names, HTML content)
- Conversation history (searchable via SQLite FTS)

#### UX Design

**Trigger:**
- Search icon in header
- Keyboard shortcut: `Cmd/Ctrl + F`

**Interface:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search specs...                                      [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Results for "user"                                          │
│                                                             │
│ Features (3)                                                │
│ ├─ User Login - "Allow users to authenticate..."            │
│ ├─ User Registration - "New user signup flow..."            │
│ └─ User Profile - "View and edit user details..."           │
│                                                             │
│ Entities (2)                                                │
│ ├─ users - Table with id, email, name fields                │
│ └─ user_sessions - Session tracking table                   │
│                                                             │
│ Endpoints (4)                                               │
│ ├─ POST /auth/login - User login                            │
│ ├─ POST /users - Create user                                │
│ ├─ GET /users/:id - Get user by ID                          │
│ └─ mutation createUser - GraphQL user creation              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Approach

**File-based content:**
- Use `grep` or similar for YAML/DBML/GraphQL files
- Index on startup, update on file changes

**Conversation history:**
- Use SQLite FTS5 (already in schema)
- Query `messages_fts` table

#### Implementation Details

**Search Scope (Resolved):**
- **Decision:** Conversation history opt-in via filter toggle
- Default search: Features, entities, endpoints, components (file-based content)
- Optional filter: "Include conversation history" checkbox
- Rationale: Conversation history can be noisy; opt-in keeps results focused

**Debounce Timing (Resolved):**
- **Decision:** 200ms debounce for live search
- Balances responsiveness with performance
- Shorter than typical 300ms: Foundry's local file search is fast
- Cancel pending search on new input
- Show "searching..." indicator after 100ms

---

### F4: Cross-References

#### Description

Navigate relationships between artifacts - see which features use an entity, which components belong to a feature, etc.

#### Requirements

**Reference Types:**

| From | To | Relationship |
|------|----|--------------|
| Feature | Entity | "uses" |
| Feature | Endpoint | "exposes" |
| Feature | Component | "renders" |
| Feature | Feature | "depends on" |
| Entity | Entity | "relates to" |
| Endpoint | Entity | "operates on" |
| Component | Component | "includes" |

**Navigation:**
- From any artifact, see incoming and outgoing references
- Click to navigate to related artifact
- Visualize as graph (in React Flow view)

#### UX Design

**References Panel (on artifact detail):**
```
┌─────────────────────────────────────────────────────────────┐
│ References                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Uses Entities:                                              │
│ ├─ User (verify credentials)                                │
│ └─ Session (create on login)                                │
│                                                             │
│ Exposes Endpoints:                                          │
│ ├─ POST /auth/login                                         │
│ └─ mutation login                                           │
│                                                             │
│ Renders Components:                                         │
│ ├─ Login Page                                               │
│ └─ Login Form                                               │
│                                                             │
│ Dependencies:                                               │
│ └─ ← User Management (this feature depends on)              │
│                                                             │
│ Dependents:                                                 │
│ └─ → Dashboard (depends on this feature)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Graph View:**
- Toggle in visualization tab
- Show all artifacts as nodes
- Edges represent references
- Filter by type

#### Technical Approach

**Reference Storage:**
- References already in feature YAML files (`schemaRefs`, `apiRefs`, `componentRefs`, `dependencies`)
- Build graph in memory on load
- Update on changes

**Graph Building:**
```typescript
interface ReferenceGraph {
  nodes: Map<string, ArtifactNode>;
  edges: ReferenceEdge[];

  getIncoming(artifactId: string): ReferenceEdge[];
  getOutgoing(artifactId: string): ReferenceEdge[];
  findOrphans(): ArtifactNode[];
}
```

#### Implementation Details

**Reverse Reference Storage (Resolved):**
- **Decision:** Compute on-demand, cache in memory
- Forward references stored in YAML files (schemaRefs, apiRefs, etc.)
- Reverse references (incoming) computed when viewing artifact
- Cache computed graph in memory for session duration
- Invalidate cache on file changes
- No SQLite storage needed - graph is fast to compute (<100ms for 1000 artifacts)

**Rationale:**
- Avoids data duplication and sync issues
- Forward refs are the source of truth
- Fast enough to compute on-the-fly
- Memory cache handles repeated access
- Simple implementation without storage layer

**Circular Dependency Handling (Resolved):**
- **Decision:** Detect, visualize, and warn (but allow)

**Detection:**
- Run cycle detection algorithm (DFS-based) on graph build
- Identify all circular chains (A → B → C → A)
- Store cycles in graph metadata

**Visualization Strategy:**

| Scenario | Visualization | User Experience |
|----------|---------------|-----------------|
| No cycles | Standard DAG layout | Clean top-to-bottom flow |
| Small cycle (2-3 nodes) | Circular arc with indicator | Orange "⟳" badge on nodes |
| Large cycle (4+ nodes) | Highlight cycle path | Show cycle list in panel |
| Multiple cycles | Color-code by cycle | Different colors for each cycle |

**UI Warning:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠ Circular Dependencies Detected (2)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Cycle 1:                                                    │
│ User Login → Session Management → Authentication            │
│ → User Login                                                │
│                                                             │
│ Cycle 2:                                                    │
│ Order Processing → Payment → Order Processing               │
│                                                             │
│ This may indicate:                                          │
│ • Tightly coupled features (consider refactoring)           │
│ • Shared dependencies (acceptable if intentional)           │
│                                                             │
│ [View in Graph]                              [Mark as OK]   │
└─────────────────────────────────────────────────────────────┘
```

**Graph Layout with Cycles:**
- Use force-directed layout instead of hierarchical
- Cycles visualized with curved edges
- Highlight cycle nodes with colored borders
- Tooltip shows full cycle path on hover

**Allow vs Block:**
- **Allow cycles**: Circular dependencies can be intentional (e.g., auth ↔ session)
- Warn but don't block saving
- Users can mark cycles as "acknowledged/intentional"
- Analyzer (F9) reports cycles as warnings, not errors

---

## Quality Assurance

### F2: Validation Engine

#### Description

Automated checks for schema consistency, reference integrity, and artifact validity.

#### Requirements

**Validation Types:**

| Type | What It Checks |
|------|----------------|
| Reference Integrity | Feature refs point to existing entities/endpoints/components |
| Schema Syntax | DBML parses correctly, valid data types |
| API Syntax | OpenAPI/GraphQL schemas are valid |
| Relationship Consistency | Foreign keys reference existing tables |
| Naming Conventions | Consistent naming patterns (optional) |

**When to Validate:**
- On save (automatic)
- On demand (manual trigger)
- Before Git commit (optional hook)

**Output:**
- List of issues with severity (error, warning, info)
- Link to affected artifact
- Suggested fix when possible

#### UX Design

**Status Indicator:**
```
┌───────────────────────────────────┐
│ Validation: ✓ 0 errors  ⚠ 2 warnings │
└───────────────────────────────────┘
```

**Issues Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│ Validation Issues                                      [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠ Warning: Orphaned entity reference                        │
│   Feature "Payment Checkout" references entity "Cart"       │
│   but "Cart" does not exist in schema.                      │
│   → features/payment-checkout.yaml:25                       │
│   [Create Entity] [Remove Reference]                        │
│                                                             │
│ ⚠ Warning: Missing index recommendation                     │
│   Entity "orders" has foreign key "user_id" without index.  │
│   Consider adding index for query performance.              │
│   → schemas/schema.dbml:45                                  │
│   [Add Index] [Ignore]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Approach

**DBML Validation:**
- Use DBML parser library (or AI if unavailable)
- Check syntax, relationships, data types

**OpenAPI Validation:**
- Use `@apidevtools/swagger-parser` or similar
- Validate against OpenAPI 3.0 spec

**GraphQL Validation:**
- Use `graphql` package `buildSchema`
- Check for valid SDL syntax

**Reference Integrity:**
- Build reference graph from features
- Check all refs resolve to existing artifacts

#### Implementation Details

**DBML Validation (Resolved):**
- **Decision:** Use `@dbml/core` npm package for parsing
- Package provides official DBML parser maintained by dbdiagram.io team
- If parse fails, use AI (Sonnet) as fallback validator
- AI validates syntax and provides detailed error messages
- Cache AI validation results for 5 minutes to reduce costs

**Severity Blocking (Resolved):**
- **Decision:** Errors block save, warnings allow save with confirmation

| Severity | Block Save? | User Experience |
|----------|-------------|-----------------|
| Error | Yes | Red badge, "Fix N errors to save" button disabled |
| Warning | No (with confirmation) | Yellow badge, "Save anyway?" confirmation dialog |
| Info | No | Blue badge, informational only |

**Error Examples:**
- Invalid DBML/OpenAPI/GraphQL syntax
- Broken references (feature refs non-existent entity)
- Foreign key referencing non-existent table

**Warning Examples:**
- Missing recommended index on foreign key
- Orphaned entity (not referenced by any feature)
- Naming convention violations (if constitution defines rules)

**Info Examples:**
- Feature has no tasks defined
- Missing description field (optional but recommended)

---

### F9: Enhanced Consistency Analyzer

#### Description

Extends the existing Validation Engine (F2) with deeper cross-artifact consistency checks and constitution compliance validation.

#### Requirements

**Additional Checks:**
| Check | Description |
|-------|-------------|
| Naming Consistency | Tables singular/plural, fields snake_case |
| API-Schema Alignment | Endpoints match entity operations |
| Component-Feature Linkage | Every feature has component refs |
| Dependency Cycles | Detect circular feature dependencies |
| Constitution Compliance | Artifacts follow constitution rules |
| Orphaned Artifacts | Entities/endpoints not referenced by features |

**Execution:**
- On-demand via `/api/analyze` endpoint
- Automatic via agent hooks (if configured)
- Before Git commit (if hook enabled)

**Output:**
- Structured report with issues
- Severity levels (error, warning, info)
- Location in artifact (file:line or field path)
- Suggested fix when possible

#### UX Design

**Analyzer Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│ Consistency Analysis                    [Run Analysis]       │
├─────────────────────────────────────────────────────────────┤
│ Last run: 5 minutes ago                                     │
│ Status: ⚠ 2 warnings, 0 errors                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠ Warning: Naming inconsistency                             │
│   Table "Users" should be "users" (snake_case singular)     │
│   → schemas/schema.dbml:12                                  │
│   Constitution rule: coding.naming.database_tables          │
│   [Auto-fix] [Ignore]                                       │
│                                                             │
│ ⚠ Warning: Orphaned endpoint                                │
│   POST /api/legacy/sync not referenced by any feature       │
│   → apis/openapi.yaml:145                                   │
│   [Link to Feature] [Remove Endpoint]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Approach

**Analysis Rules:**
```typescript
interface AnalysisRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: (project: Project) => AnalysisIssue[];
  autoFix?: (issue: AnalysisIssue) => void;
}

interface AnalysisIssue {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: {
    file: string;
    line?: number;
    field?: string;
  };
  suggestion?: string;
  constitutionRef?: string;
}
```

---

### F10: Implementation Checklist

#### Description

Auto-generated checklist from feature acceptance criteria. Acts as "unit tests for English" - quality gates for specifications.

#### Requirements

**Generation:**
- Created automatically from `acceptanceCriteria` in feature
- Each criterion becomes a checklist item
- User can add custom items

**Verification:**
- Manual checkboxes
- Optional: Block feature completion until verified
- Timestamp when verified
- Notes field for context

**Export:**
- Markdown format for PR descriptions
- Copy to clipboard

#### File Schema

**Embedded in feature.yaml:**
```yaml
# ... existing feature fields ...

checklist:
  - id: "check_1"
    criterion: "User can enter email and password"
    source: "acceptanceCriteria.0"
    verified: true
    verifiedAt: "2025-01-15T15:00:00Z"
    verifiedBy: "user"
    notes: "Tested on desktop and mobile"

  - id: "check_2"
    criterion: "Invalid credentials show error message"
    source: "acceptanceCriteria.1"
    verified: true
    verifiedAt: "2025-01-15T15:05:00Z"
    verifiedBy: "user"
    notes: ""

  - id: "check_3"
    criterion: "Successful login redirects to dashboard"
    source: "acceptanceCriteria.2"
    verified: false
    verifiedAt: null
    verifiedBy: null
    notes: ""

checklistProgress:
  total: 3
  verified: 2
  percentComplete: 67
```

#### UX Design

**Feature Detail View - Checklist Section:**
```
┌─────────────────────────────────────────────────────────────┐
│ Implementation Checklist               Progress: 67% ██████░░│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ☑ User can enter email and password                         │
│   Verified Jan 15, 3:00 PM                                  │
│   Note: Tested on desktop and mobile                        │
│                                                             │
│ ☑ Invalid credentials show error message                    │
│   Verified Jan 15, 3:05 PM                                  │
│                                                             │
│ ☐ Successful login redirects to dashboard                   │
│   Not verified                                 [Verify]     │
│                                                             │
│ [+ Add Item]                            [Export as Markdown] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Export Format:**
```markdown
## Implementation Checklist: User Login

- [x] User can enter email and password
- [x] Invalid credentials show error message
- [ ] Successful login redirects to dashboard

Progress: 2/3 (67%)
```

---

## Collaboration & Documentation

### F3: Per-Artifact History

#### Description

Each feature, entity, endpoint, and component tracks its own change history.

#### Requirements

**What to Track:**
- Creation event
- Every modification (field-level changes)
- Deletion (soft delete with history)
- Who/what made the change (user vs AI)

**History Entry:**
```yaml
- timestamp: "2025-01-15T14:30:00Z"
  action: "update"
  actor: "ai:cto-agent"
  changes:
    - field: "description"
      from: "User login flow"
      to: "User authentication with email/password"
    - field: "schemaRefs"
      added: ["Session"]
  reason: "CTO phase: Added session tracking"
```

#### UX Design

**History Button:**
Each artifact card/detail view has a "History" button.

**History Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│ History: User Login                                    [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Today                                                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 2:30 PM - AI (CTO Agent)                                ││
│ │ Updated description and added schemaRefs                ││
│ │ "CTO phase: Added session tracking"                     ││
│ │ [View Changes]                                          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Yesterday                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 4:15 PM - AI (CPO Agent)                                ││
│ │ Created feature                                         ││
│ │ "Initial feature definition from Q&A"                   ││
│ │ [View Changes]                                          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [Load More]                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Approach

**Storage:**
- Store history in SQLite (not YAML files)
- Keeps file sizes manageable
- Enables efficient querying

**SQLite Schema Addition:**
```sql
CREATE TABLE artifact_history (
  id TEXT PRIMARY KEY,
  artifact_type TEXT NOT NULL,  -- 'feature', 'entity', 'endpoint', 'component'
  artifact_id TEXT NOT NULL,
  action TEXT NOT NULL,         -- 'create', 'update', 'delete'
  actor TEXT NOT NULL,          -- 'user', 'ai:cpo-agent', 'ai:cto-agent'
  changes TEXT NOT NULL,        -- JSON of field changes
  reason TEXT,                  -- Why the change was made
  timestamp TEXT NOT NULL
);

CREATE INDEX idx_history_artifact ON artifact_history(artifact_type, artifact_id);
CREATE INDEX idx_history_timestamp ON artifact_history(timestamp);
```

#### Implementation Details

**Retention Policy (Resolved):**
- **Decision:** Retain forever with optional manual cleanup
- History stored in SQLite (efficient, queryable)
- No automatic pruning - users decide when to clean up
- Provide "Cleanup Old History" feature in settings:
  - Delete history older than N days (user configurable)
  - Option to keep milestone versions (e.g., phase transitions)
  - Preview before deletion (show count and date range)
- Default: No cleanup (storage is cheap, context is valuable)

**Rationale:**
- Spec evolution history provides valuable project context
- SQLite storage is efficient (text diffs are small)
- Manual cleanup gives users control
- Milestone preservation protects important changes

**Export Feature (Resolved):**
- **Decision:** Yes, exportable to JSON and Markdown

**Export Formats:**

| Format | Use Case | Content |
|--------|----------|---------|
| JSON | Programmatic access, backup | Full history with metadata |
| Markdown | Human-readable report | Timeline view with diffs |
| CSV | Spreadsheet analysis | Flat list of changes |

**Export UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Export History: User Login                            [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Format:                                                     │
│ ○ JSON (full data)                                          │
│ ● Markdown (readable timeline)                              │
│ ○ CSV (spreadsheet)                                         │
│                                                             │
│ Date Range:                                                 │
│ From: [2025-01-01] To: [2025-01-26]                         │
│                                                             │
│ ☑ Include diffs                                             │
│ ☑ Include AI reasoning                                      │
│                                                             │
│ [Cancel]                                  [Export (12 KB)]  │
└─────────────────────────────────────────────────────────────┘
```

**Markdown Export Example:**
```markdown
# Change History: User Login
Exported: 2025-01-26

## 2025-01-15 14:30 - AI (CTO Agent)
**Action:** Updated description and schemaRefs

**Reason:** CTO phase: Added session tracking

**Changes:**
- **description**
  - From: "User login flow"
  - To: "User authentication with email/password"
- **schemaRefs**
  - Added: ["Session"]
```

---

### F5: Inline Annotations

#### Description

Attach notes and comments to specific fields or lines within artifacts.

#### Requirements

**What Can Be Annotated:**
- Feature fields (description, acceptance criteria, etc.)
- Schema entity fields
- API endpoint parameters/responses
- Component sections

**Annotation Content:**
- Markdown text
- Author (user or AI)
- Timestamp
- Optional: resolved/unresolved status

#### UX Design

**Inline Indicator:**
```
┌─────────────────────────────────────────────────────────────┐
│ Feature: User Login                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Description:                                                │
│ Allow users to authenticate with email/password       [💬2] │
│                                                             │
│ Acceptance Criteria:                                        │
│ ✓ User can enter email and password                         │
│ ✓ Invalid credentials show error message              [💬1] │
│ ✓ Successful login redirects to dashboard                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Annotation Popover:**
```
┌─────────────────────────────────────────────────────────────┐
│ Annotations (2)                                        [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User - Jan 15, 2:30 PM                                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Should we also support OAuth (Google, GitHub)?          ││
│ │ Leaving this for phase 2.                               ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ AI (CTO Agent) - Jan 15, 3:00 PM                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Consider rate limiting for failed attempts.             ││
│ │ Added to implementation plan.                           ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [Add Annotation]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Approach

**Storage:**
- Store annotations in SQLite (not in YAML files)
- Keeps YAML clean and focused
- Enables querying (show all unresolved annotations)

**SQLite Schema Addition:**
```sql
CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  artifact_type TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  field_path TEXT NOT NULL,     -- e.g., "acceptanceCriteria.1"
  content TEXT NOT NULL,        -- Markdown
  author TEXT NOT NULL,         -- 'user', 'ai:cpo-agent', etc.
  status TEXT DEFAULT 'open',   -- 'open', 'resolved'
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX idx_annotations_artifact ON annotations(artifact_type, artifact_id);
CREATE INDEX idx_annotations_status ON annotations(status);
```

**Field Path Format:**
- Simple fields: `"description"`
- Array items: `"acceptanceCriteria.0"`
- Nested fields: `"technical.schemaRefs.0.usage"`

#### Implementation Details

**AI Annotation Creation (Resolved):**
- **Decision:** Yes, AI can create annotations automatically

**When AI Creates Annotations:**
| Trigger | Example | Auto-resolve? |
|---------|---------|---------------|
| Detects potential issue | "Missing rate limiting for this endpoint" | No - user reviews |
| Suggests improvement | "Consider adding index for query performance" | No - user reviews |
| Documents decision | "Using OAuth per constitution.security.authentication" | Yes - informational |
| Flags ambiguity | "Unclear: should this be sync or async?" | No - needs clarification |

**Annotation Types:**
| Type | Icon | Auto-created by AI? | User Action Required |
|------|------|---------------------|----------------------|
| `suggestion` | 💡 | Yes | Optional (accept/dismiss) |
| `warning` | ⚠️ | Yes | Recommended review |
| `question` | ❓ | Yes | Answer required |
| `info` | ℹ️ | Yes | No action needed |
| `note` | 📝 | No | User-created only |

**AI Annotation Workflow:**
1. AI detects issue during generation or validation
2. Creates annotation with `status: 'pending'`
3. User sees annotation in UI with badge count
4. User can:
   - Accept suggestion (apply change)
   - Dismiss (mark as resolved)
   - Convert to user note
   - Respond with answer (for questions)

**UI for AI Annotations:**
```
┌─────────────────────────────────────────────────────────────┐
│ 💡 AI Suggestion                                            │
├─────────────────────────────────────────────────────────────┤
│ Consider adding rate limiting to prevent abuse              │
│                                                             │
│ Suggested change:                                           │
│ + rateLimiting:                                             │
│ +   maxAttempts: 5                                          │
│ +   windowMinutes: 15                                       │
│                                                             │
│ [Apply]  [Dismiss]                          [Convert to Note]│
└─────────────────────────────────────────────────────────────┘
```

**YAML File Visibility (Resolved):**
- **Decision:** No, annotations are NOT visible in YAML files
- Annotations stored only in SQLite `annotations` table
- YAML files remain clean and focused on spec data
- Separation allows annotations without polluting version control

**Rationale for SQLite-only storage:**

| Aspect | YAML Comments | SQLite Storage |
|--------|---------------|----------------|
| Git diffs | Noisy (comments change frequently) | Clean (only spec changes) |
| Parsing | Requires comment-preserving YAML parser | Standard YAML parser works |
| Searchability | Regex search in files | Full-text search in SQL |
| Querying | Difficult (need to parse comments) | Easy (SQL queries) |
| Multi-user | Merge conflicts on comments | Separate annotation db per user |

**Export Option:**
- Users can export annotations to Markdown for sharing
- Annotations can be included in PR descriptions
- "Show annotations inline" preview mode in UI (read-only)

**Example Export:**
```markdown
# Feature: User Login - Annotations

## AI Suggestions (2)

💡 **Rate limiting** (acceptanceCriteria.1)
Consider adding rate limiting to prevent abuse
*Suggested 2025-01-15*

💡 **Missing edge case** (description)
What happens if user's account is locked?
*Suggested 2025-01-14*

## User Notes (1)

📝 **Implementation note** (technical.implementation)
Remember to use bcrypt with 12 rounds for password hashing
*Added 2025-01-15*
```

---

## Implementation Tracking

### F8: Task Breakdown

#### Description

Each feature has an auto-generated task list derived from implementation steps. Tasks are displayed within the feature detail view (feature-integrated approach).

#### Requirements

**Task Properties:**
| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| title | string | What to do |
| status | enum | pending, in_progress, completed |
| complexity | enum | low, medium, high |
| dependsOn | string[] | Task IDs that must complete first |
| implementationStepId | string | Link to implementation plan step |

**Generation:**
- Auto-generated from feature's `implementationPlan`
- Each implementation step becomes a task
- Dependencies inferred from step order
- User can add custom tasks
- **Only generated for non-implemented features** (`implemented: false`)
- Features from reverse engineering are marked `implemented: true` and skip task generation

**Progress Tracking:**
- Visual progress bar in feature card
- Roll-up to module and project level
- AI can update status during implementation

#### File Schema

**Embedded in feature.yaml:**
```yaml
# ... existing feature fields ...

tasks:
  - id: "task_1"
    title: "Create Session entity in database"
    status: "completed"
    complexity: "low"
    dependsOn: []
    implementationStepId: "step_1"
    completedAt: "2025-01-15T14:00:00Z"

  - id: "task_2"
    title: "Implement login API endpoint"
    status: "in_progress"
    complexity: "medium"
    dependsOn: ["task_1"]
    implementationStepId: "step_2"

  - id: "task_3"
    title: "Build login page UI"
    status: "pending"
    complexity: "medium"
    dependsOn: ["task_2"]
    implementationStepId: "step_3"

taskProgress:
  total: 3
  completed: 1
  inProgress: 1
  pending: 1
  percentComplete: 33
```

#### UX Design

**Feature Detail View - Tasks Section:**
```
┌─────────────────────────────────────────────────────────────┐
│ Implementation Tasks                     Progress: 33% ████░░│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓ Create Session entity in database           [low]         │
│   Completed Jan 15, 2:00 PM                                 │
│                                                             │
│ ◐ Implement login API endpoint                [medium]      │
│   In progress                                  [Mark Done]  │
│                                                             │
│ ○ Build login page UI                         [medium]      │
│   Blocked by: Implement login API endpoint                  │
│                                                             │
│ [+ Add Task]                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Decision Reference

See: [decisions.md](../decisions.md) D18 (Tasks UI - Feature Integrated)

---

## Dependencies

- **F9 (Enhanced Analyzer)** extends [F2 (Validation Engine)](#f2-validation-engine) with deeper checks
- **F9 (Enhanced Analyzer)** uses [F6: Constitution](features-setup.md#f6-project-constitution) for compliance validation
- **F2 (Validation Engine)** uses DBML/OpenAPI/GraphQL parsers for syntax validation
- **F4 (Cross-References)** uses existing reference data from feature YAML files
- **F8 (Task Breakdown)** only applies to features with `implemented: false` status
