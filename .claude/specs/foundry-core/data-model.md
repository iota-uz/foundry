# Data Model

**Status:** Draft

## Overview

Foundry uses a hybrid storage approach:
- **File System:** Project structure, specs, artifacts (Git-trackable)
- **SQLite:** Workflow checkpoints, undo stack, analysis results (local only)

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File Format | YAML | Human-readable, good Git diffs, familiar to developers |
| ID Format | Slug-based | Human-readable (e.g., `user-login`, `checkout`) |
| ID Scope | Per-module | Same slug allowed in different modules |
| ID Conflicts | Block + prompt | User chooses unique name |
| Relationships | Bidirectional | Both sides store refs for navigation |
| Schema Version | Global | Single version in project.yaml |

## File System Structure

```
project-root/
├── .foundry/
│   ├── foundry.db              # SQLite database
│   ├── project.yaml            # Project metadata + global schema version
│   ├── constitution.yaml       # Optional: Governing principles (F6)
│   ├── lessons-learned.md      # AI-maintained feedback loop (F11)
│   ├── prompts/                # Handlebars prompt templates
│   │   ├── cpo-generate-question-system.hbs
│   │   ├── cpo-generate-question-user.hbs
│   │   ├── cto-generate-question-system.hbs
│   │   ├── cto-generate-question-user.hbs
│   │   ├── schema-generator-system.hbs
│   │   ├── schema-generator-user.hbs
│   │   └── ... (all other prompt files)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── module.yaml     # Module metadata
│   │   │   └── features/
│   │   │       ├── login.yaml  # Includes tasks + checklist
│   │   │       └── register.yaml
│   │   └── payments/
│   │       ├── module.yaml
│   │       └── features/
│   │           └── checkout.yaml
│   ├── schemas/
│   │   └── schema.dbml         # Unified DBML schema
│   ├── apis/
│   │   ├── openapi.yaml        # OpenAPI spec
│   │   └── schema.graphql      # GraphQL schema
│   └── components/
│       ├── pages/
│       │   ├── login.html
│       │   └── dashboard.html
│       └── shared/
│           ├── button.html
│           └── modal.html
├── src/                        # Existing codebase (for RE mode)
└── ...
```

**Key Changes from Original:**
- Features organized under their module directories (scoped IDs)
- Slug-based IDs (directory/file names are the IDs)
- Bidirectional references between artifacts

## File Schemas

### project.yaml

```yaml
id: "proj_abc123"
name: "My SaaS App"
description: "A project management tool for remote teams"
mode: "new"                     # new | reverse_engineered
phase: "cto"                    # cpo | clarify | cto | complete
version: "1"
settings:
  defaultBranch: "main"
  autoSave: true
  autoCommit: false
createdAt: "2025-01-15T10:00:00Z"
updatedAt: "2025-01-15T14:30:00Z"
```

### Constitution File (constitution.yaml) - Optional (F6)

```yaml
version: "1.0"
createdAt: "2025-01-15T10:00:00Z"
updatedAt: "2025-01-15T14:30:00Z"

# Guiding principles for all AI decisions
principles:
  - "User data privacy is paramount"
  - "Fail fast, fail gracefully"
  - "Accessibility is not optional"

# Coding standards
coding:
  naming:
    functions: "snake_case"
    classes: "PascalCase"
    database_tables: "snake_case_singular"
    database_columns: "snake_case"
  style:
    max_function_length: 50
    require_docstrings: true
    prefer_composition: true

# Security requirements
security:
  authentication: "JWT with refresh tokens"
  authorization: "Role-based access control"
  input_validation: "Sanitize all user input at API boundary"
  secrets: "Environment variables only, never hardcode"
  password_hashing: "bcrypt with cost factor 12"

# UX patterns
ux:
  error_format: "Include: what went wrong, why, how to fix"
  loading_states: "Skeleton screens, not spinners"
  accessibility: "WCAG 2.1 AA compliance"
  responsive: "Mobile-first design"

# Tech constraints
constraints:
  allowed_libraries:
    - "axios"
    - "lodash"
    - "date-fns"
  forbidden_libraries:
    - "moment.js"
    - "jquery"
  node_version: ">=20.0.0"
  typescript: "strict mode required"

# Agent hooks (F12)
hooks:
  onFeatureSave:
    - action: validateSchema
    - action: updateChecklist
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

### Module File (modules/*.yaml)

```yaml
id: "mod_xyz789"
name: "Authentication"
description: "User authentication and authorization"
order: 1
features:
  - "feat_login"
  - "feat_register"
  - "feat_password_reset"
createdAt: "2025-01-15T10:30:00Z"
updatedAt: "2025-01-15T12:00:00Z"
```

### Feature File (features/*.yaml)

```yaml
id: "feat_login"
moduleId: "mod_xyz789"
name: "User Login"
description: "Allow users to authenticate with email/password"
status: "completed"             # draft | in_progress | completed
phase: "complete"               # cpo | clarify | cto | complete
implemented: false              # true for features extracted via reverse engineering
source: "new"                   # new | reverse_engineered

# Implementation files - populated for implemented features (reverse engineered)
# Empty array for new features until they are implemented
implementationFiles:
  - path: "src/auth/login.ts"
    description: "Login endpoint handler"
  - path: "src/auth/auth.service.ts"
    description: "Authentication service with password verification"
  - path: "src/models/user.ts"
    description: "User entity definition"

# Business requirements (CPO phase)
business:
  userStory: "As a user, I want to log in so I can access my account"
  acceptanceCriteria:
    - "User can enter email and password"
    - "Invalid credentials show error message"
    - "Successful login redirects to dashboard"
  priority: "high"

# Technical details (CTO phase)
technical:
  # References to unified schema entities
  schemaRefs:
    - entity: "User"
      usage: "Verify credentials"
    - entity: "Session"
      usage: "Create on successful login"

  # References to API endpoints
  apiRefs:
    - type: "rest"
      method: "POST"
      path: "/auth/login"
    - type: "graphql"
      operation: "mutation login"

  # References to UI components
  componentRefs:
    - id: "comp_login_page"
      type: "page"
    - id: "comp_login_form"
      type: "component"

# Feature dependencies
dependencies:
  - "feat_user_management"      # Depends on user entity

# Implementation plan
implementationPlan:
  - id: "step_1"
    order: 1
    title: "Create Session entity in database"
    description: "Add sessions table with user_id, token, expires_at"
    complexity: "low"
  - id: "step_2"
    order: 2
    title: "Implement login API endpoint"
    description: "POST /auth/login - validate credentials, create session"
    complexity: "medium"
  - id: "step_3"
    order: 3
    title: "Build login page UI"
    description: "Login form with email, password, error states"
    complexity: "medium"

# Task breakdown (F8) - auto-generated from implementationPlan
tasks:
  - id: "task_1"
    title: "Create Session entity in database"
    status: "completed"           # pending | in_progress | completed
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

# Implementation checklist (F10) - auto-generated from acceptanceCriteria
checklist:
  - id: "check_1"
    criterion: "User can enter email and password"
    source: "business.acceptanceCriteria.0"
    verified: true
    verifiedAt: "2025-01-15T15:00:00Z"
    verifiedBy: "user"
    notes: "Tested on desktop and mobile"
  - id: "check_2"
    criterion: "Invalid credentials show error message"
    source: "business.acceptanceCriteria.1"
    verified: false
    verifiedAt: null
    verifiedBy: null
    notes: ""

checklistProgress:
  total: 2
  verified: 1
  percentComplete: 50

createdAt: "2025-01-15T11:00:00Z"
updatedAt: "2025-01-15T15:00:00Z"
```

### Schema File (schemas/schema.dbml)

```dbml
// Unified database schema
// Features: user-management, user-login, user-register

Table users {
  id uuid [pk]
  email varchar(255) [unique, not null]
  password_hash varchar(255) [not null]
  name varchar(255)
  created_at timestamp [default: `now()`]
  updated_at timestamp

  indexes {
    email
  }
}

Table sessions {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  token varchar(255) [unique, not null]
  expires_at timestamp [not null]
  created_at timestamp [default: `now()`]

  indexes {
    token
    user_id
  }
}

// Feature: payments
Table payments {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  amount decimal(10,2) [not null]
  status varchar(50) [not null]
  created_at timestamp [default: `now()`]
}
```

### OpenAPI File (apis/openapi.yaml)

```yaml
openapi: "3.0.0"
info:
  title: "My SaaS API"
  version: "1.0.0"
  description: "API for project management tool"

paths:
  /auth/login:
    post:
      summary: "User login"
      tags: ["Authentication"]
      x-foundry-feature: "feat_login"      # Foundry extension
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
      responses:
        "200":
          description: "Login successful"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthResponse"
        "401":
          description: "Invalid credentials"

components:
  schemas:
    AuthResponse:
      type: object
      properties:
        token:
          type: string
        expiresAt:
          type: string
          format: date-time
```

### GraphQL File (apis/schema.graphql)

```graphql
# Unified GraphQL schema

type User {
  id: ID!
  email: String!
  name: String
  createdAt: DateTime!
}

type Session {
  id: ID!
  token: String!
  expiresAt: DateTime!
  user: User!
}

type AuthPayload {
  token: String!
  expiresAt: DateTime!
  user: User!
}

type Query {
  me: User
  # x-foundry-feature: feat_user_profile
}

type Mutation {
  login(email: String!, password: String!): AuthPayload!
  # x-foundry-feature: feat_login

  register(email: String!, password: String!, name: String): AuthPayload!
  # x-foundry-feature: feat_register
}
```

### Component Files (components/**/*.html)

```html
<!-- components/pages/login.html -->
<!--
  id: comp_login_page
  name: Login Page
  type: page
  features: [feat_login]
-->
<div class="min-h-screen flex items-center justify-center bg-gray-900">
  <div class="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-xl">
    <div>
      <h2 class="text-center text-3xl font-bold text-white">
        Sign in to your account
      </h2>
    </div>
    <form class="mt-8 space-y-6">
      <div class="space-y-4">
        <div>
          <label for="email" class="text-sm font-medium text-gray-300">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label for="password" class="text-sm font-medium text-gray-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <button
        type="submit"
        class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
      >
        Sign in
      </button>
    </form>
  </div>
</div>
```

### Prompt Files (prompts/)

Workflow LLM steps reference Handlebars templates stored in `.foundry/prompts/`.

**Structure:**
- All prompt files in single flat directory
- Naming: `{workflow}-{operation}-{type}.hbs`
- Types: `system` (system prompt) or `user` (user prompt)

**File Format:**
Each `.hbs` file contains a Handlebars template:

```handlebars
Generate a conversational question for: {{currentTopic.name}}

{{#if answersSummary}}
Build on previous answers: {{answersSummary}}
{{/if}}

Generate one clear question.
```

**Context Variables:**
Templates have access to workflow state:
- `currentTopic` - Topic being explored
- `answers` - Previous answers
- `phase` - Workflow phase
- `model` - Claude model
- All workflow state variables

See `tools.md` for complete Handlebars documentation.

## SQLite Schema

### Database: .foundry/foundry.db

```sql
-- Workflow checkpoints (for pause/resume)
CREATE TABLE workflow_checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,          -- 'cpo-phase', 'clarify-phase', 'cto-phase', 're-workflow', 'actualize-workflow'
  current_step_id TEXT NOT NULL,
  status TEXT NOT NULL,               -- 'running', 'paused', 'waiting_user', 'completed', 'failed'

  -- Topic/question tracking (for Q&A workflows)
  current_topic_index INTEGER DEFAULT 0,
  current_question_index INTEGER DEFAULT 0,
  topic_question_counts TEXT,         -- JSON: {"problem-statement": 3, "target-users": 2}

  -- Accumulated data
  answers TEXT NOT NULL,              -- JSON of collected answers
  skipped_questions TEXT,             -- JSON array of skipped question IDs
  data TEXT NOT NULL,                 -- JSON of workflow-specific accumulated data

  -- Clarify phase state (when active)
  clarify_state TEXT,                 -- JSON: {ambiguities, currentIndex, resolvedCount, deferredCount}

  -- Execution history
  step_history TEXT NOT NULL,         -- JSON array of StepExecution records

  -- Timestamps
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  paused_at TEXT,
  completed_at TEXT,

  -- Error tracking
  last_error TEXT,                    -- Error message if status='failed'
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX idx_checkpoint_session ON workflow_checkpoints(session_id);
CREATE INDEX idx_checkpoint_project ON workflow_checkpoints(project_id);
CREATE INDEX idx_checkpoint_status ON workflow_checkpoints(status);

-- Step execution log (detailed history for debugging)
CREATE TABLE step_executions (
  id TEXT PRIMARY KEY,
  checkpoint_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  step_type TEXT NOT NULL,            -- 'code', 'llm', 'question', 'conditional', 'loop', 'nested_workflow'
  status TEXT NOT NULL,               -- 'completed', 'failed', 'skipped'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  input_data TEXT,                    -- JSON of step input
  output_data TEXT,                   -- JSON of step output
  error TEXT,                         -- Error message if failed
  llm_tokens_used INTEGER,            -- Token count for LLM steps
  duration_ms INTEGER,                -- Execution time
  FOREIGN KEY (checkpoint_id) REFERENCES workflow_checkpoints(id)
);

CREATE INDEX idx_step_checkpoint ON step_executions(checkpoint_id);
CREATE INDEX idx_step_status ON step_executions(status);

-- Undo/Redo history
CREATE TABLE undo_actions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  action_type TEXT NOT NULL,          -- 'create', 'update', 'delete'
  target_type TEXT NOT NULL,          -- 'project', 'module', 'feature', etc.
  target_id TEXT NOT NULL,
  before_state TEXT,                  -- JSON snapshot before action
  after_state TEXT,                   -- JSON snapshot after action
  description TEXT NOT NULL,          -- Human-readable description
  created_at TEXT NOT NULL,
  undone_at TEXT                      -- NULL if not undone
);

CREATE INDEX idx_undo_project ON undo_actions(project_id);
CREATE INDEX idx_undo_created ON undo_actions(created_at);

-- Analysis results cache
CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scope TEXT NOT NULL,                -- 'full', 'module:auth', 'feature:login'
  status TEXT NOT NULL,               -- 'valid', 'warnings', 'errors'
  results TEXT NOT NULL,              -- JSON of analysis findings
  created_at TEXT NOT NULL,
  expires_at TEXT                     -- Cache expiration
);

CREATE INDEX idx_analysis_project ON analysis_results(project_id);

-- Decision Journal (Feature 4: Cognitive Load Reduction)
-- Records all decisions made during Q&A for timeline view and cascading undo
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  feature_id TEXT,                    -- NULL for project-level decisions
  session_id TEXT NOT NULL,           -- Links to workflow session

  -- Question/Answer context
  question_id TEXT NOT NULL,          -- ID of the question answered
  question_text TEXT NOT NULL,        -- Full question text for display
  answer_given TEXT NOT NULL,         -- JSON: selected option(s) or text value
  alternatives TEXT,                  -- JSON: other options that were available

  -- Classification
  category TEXT NOT NULL,             -- 'product_scope', 'user_experience', 'data_model', 'api_design', 'technology', 'security', 'performance', 'integration'
  phase TEXT NOT NULL,                -- 'cpo', 'clarify', 'cto'
  batch_id TEXT,                      -- If answered as part of a batch

  -- Impact tracking
  artifacts_affected TEXT,            -- JSON: [{type: 'schema', id: 'users', changes: [...]}]
  spec_changes TEXT,                  -- JSON: [{section: '...', operation: 'add', path: '...'}]
  cascade_group TEXT,                 -- Groups related decisions for cascade undo

  -- Reversibility
  can_undo INTEGER DEFAULT 1,         -- 0 = irreversible (e.g., external API calls made)
  undone_at TEXT,                     -- NULL if not undone, timestamp if undone
  undone_by TEXT,                     -- Decision ID that triggered cascade undo

  -- AI recommendation tracking
  ai_recommendation TEXT,             -- JSON: {optionId, confidence, reasoning} if AI suggested
  recommendation_followed INTEGER,    -- 1 = user accepted, 0 = user chose different

  -- Rationale (captured or inferred)
  rationale_explicit TEXT,            -- User-provided reason (if any)
  rationale_inferred TEXT,            -- AI-inferred reason based on context
  rationale_confidence TEXT,          -- 'stated', 'inferred', 'unknown'

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_feature ON decisions(feature_id);
CREATE INDEX idx_decisions_session ON decisions(session_id);
CREATE INDEX idx_decisions_cascade ON decisions(cascade_group);
CREATE INDEX idx_decisions_phase ON decisions(phase);
CREATE INDEX idx_decisions_created ON decisions(created_at);
```

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Entity Relationships                     │
└─────────────────────────────────────────────────────────────┘

┌─────────┐       ┌─────────┐       ┌─────────┐
│ Project │──1:N──│ Module  │──1:N──│ Feature │
└─────────┘       └─────────┘       └─────────┘
     │                                   │
     │                  ┌────────────────┼────────────────────┐
     │                  │                │                    │
     │                  ▼                ▼                    ▼
     │            ┌─────────┐      ┌─────────┐          ┌─────────┐
     │            │ Schema  │      │   API   │          │Component│
     │            │  Refs   │      │  Refs   │          │  Refs   │
     │            └─────────┘      └─────────┘          └─────────┘
     │                  │                │                    │
     │                  ▼                ▼                    ▼
     │            ┌─────────┐      ┌─────────┐          ┌─────────┐
     │            │  DBML   │      │ OpenAPI │          │  HTML   │
     │            │ Schema  │      │ GraphQL │          │  Files  │
     │            └─────────┘      └─────────┘          └─────────┘
     │
     │          Feature ──N:N── Feature (dependencies)
     │
     ▼
┌───────────┐       ┌───────────┐       ┌─────────┐
│ Workflow  │──1:N──│   Step    │       │  Undo   │
│Checkpoint │       │ Execution │       │ Action  │
└───────────┘       └───────────┘       └─────────┘
     │
     └── belongs to Project, tracks workflow progress

     ┌─────────────────────────────────────────────┐
     │        Cognitive Load Features              │
     └─────────────────────────────────────────────┘

┌─────────┐       ┌───────────┐
│ Project │──1:N──│ Decision  │
└─────────┘       │  (F4)     │
     │            └───────────┘
     │                 │
     │                 ├── question_id → Q&A question answered
     │                 ├── cascade_group → Groups for undo
     │                 └── undone_by → Self-ref for cascade tracking

     Decision ──N:1── Session (workflow checkpoint)
     Decision ──N:1── Feature (optional, for feature-scoped decisions)
```

## Data Integrity Rules

### File System
1. **Project ID** must be unique across all projects
2. **Module files** must reference valid project
3. **Feature files** must reference valid module
4. **Schema/API/Component refs** in features must reference existing artifacts
5. **Dependency cycles** are not allowed between features

### SQLite
1. **Workflow checkpoint** must reference valid project_id
2. **Step executions** must reference valid checkpoint_id
3. **Undo actions** must have valid before/after state for reversibility
4. **Only one active workflow** per project at a time (status='running' or 'waiting_user')
5. **Decision records** must reference valid project_id and session_id
6. **Cascade undo** must maintain referential integrity within cascade_group
7. **Decision undone_by** must reference existing decision in same cascade_group

## Migration Strategy

For schema changes to file formats:
1. Version field in project.yaml tracks format version
2. On load, check version and run migrations if needed
3. Migrations are one-way (old → new)
4. Backup created before migration

```typescript
interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: (projectPath: string) => Promise<void>;
}
```
