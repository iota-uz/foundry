# API Schema

**Status:** Draft

## Overview

Foundry uses a hybrid API approach:
- **REST endpoints** for CRUD operations on projects, modules, features, and artifacts
- **Action endpoints** for AI operations and Git commands
- **SSE endpoint** for real-time AI communication

Base URL: `http://localhost:{port}/api`

## REST Endpoints

### Projects

```
GET    /api/projects              # List all projects (for project picker)
POST   /api/projects              # Create new project
GET    /api/projects/:id          # Get project details
PUT    /api/projects/:id          # Update project metadata
DELETE /api/projects/:id          # Delete project
```

**Project Schema:**
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  path: string;                    // Filesystem path
  mode: 'new' | 'reverse_engineered';  // Creation mode
  phase: 'cpo' | 'clarify' | 'cto' | 'complete';
  createdAt: string;
  updatedAt: string;
}
```

### Modules

```
GET    /api/modules               # List all modules
POST   /api/modules               # Create module
GET    /api/modules/:id           # Get module with features
PUT    /api/modules/:id           # Update module
DELETE /api/modules/:id           # Delete module (cascades to features)
```

**Module Schema:**
```typescript
interface Module {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;                   // Display order
  featureIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Features

```
GET    /api/features              # List all features (with filters)
POST   /api/features              # Create feature
GET    /api/features/:id          # Get feature with all artifacts
PUT    /api/features/:id          # Update feature
DELETE /api/features/:id          # Delete feature
GET    /api/features/:id/dependencies  # Get dependency graph
POST   /api/features/:id/dependencies  # Add dependency
DELETE /api/features/:id/dependencies/:depId  # Remove dependency
```

**Feature Schema:**
```typescript
interface Feature {
  id: string;
  moduleId: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  phase: 'cpo' | 'clarify' | 'cto' | 'complete';
  implemented: boolean;            // true for features from reverse engineering
  source: 'new' | 'reverse_engineered';  // How the feature was created
  implementationFiles: ImplementationFile[];  // Key files for implemented features
  dependencies: string[];          // Feature IDs this depends on
  artifacts: {
    schemaRefs: string[];          // References to entities in unified schema
    apiRefs: string[];             // References to API endpoints
    componentRefs: string[];       // References to UI components
  };
  implementationPlan: ImplementationStep[];
  tasks: Task[];                   // Task breakdown (F8)
  taskProgress: TaskProgress;
  checklist: ChecklistItem[];      // Implementation checklist (F10)
  checklistProgress: ChecklistProgress;
  createdAt: string;
  updatedAt: string;
}

interface ImplementationStep {
  id: string;
  order: number;
  title: string;
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

interface ImplementationFile {
  path: string;                  // Relative path to source file
  description: string;           // What this file does for the feature
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  complexity: 'low' | 'medium' | 'high';
  dependsOn: string[];
  implementationStepId: string;
  completedAt?: string;
}

interface TaskProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percentComplete: number;
}

interface ChecklistItem {
  id: string;
  criterion: string;
  source: string;                  // Reference to acceptance criteria
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: 'user' | 'ai';
  notes?: string;
}

interface ChecklistProgress {
  total: number;
  verified: number;
  percentComplete: number;
}
```

### Artifacts

#### Schema (DBML)

```
GET    /api/artifacts/schema          # Get full DBML schema
PUT    /api/artifacts/schema          # Update full schema
GET    /api/artifacts/schema/entities # List all entities
GET    /api/artifacts/schema/entities/:name  # Get single entity
```

**Schema Response:**
```typescript
interface SchemaArtifact {
  dbml: string;                    // Raw DBML content
  entities: Entity[];              // Parsed entities
  relationships: Relationship[];   // Parsed relationships
  lastUpdated: string;
}

interface Entity {
  name: string;
  fields: Field[];
  indexes: Index[];
  featureRefs: string[];           // Which features use this entity
}
```

#### API Specs

```
GET    /api/artifacts/openapi         # Get OpenAPI spec
PUT    /api/artifacts/openapi         # Update OpenAPI spec
GET    /api/artifacts/graphql         # Get GraphQL schema
PUT    /api/artifacts/graphql         # Update GraphQL schema
GET    /api/artifacts/api/endpoints   # List all endpoints
```

**API Response:**
```typescript
interface OpenAPIArtifact {
  spec: OpenAPISpec;               // Full OpenAPI 3.0 spec
  endpoints: Endpoint[];           // Parsed endpoints
  lastUpdated: string;
}

interface GraphQLArtifact {
  schema: string;                  // SDL schema
  types: GraphQLType[];            // Parsed types
  operations: GraphQLOperation[];  // Queries/Mutations
  lastUpdated: string;
}
```

#### UI Components

```
GET    /api/artifacts/components      # List all components
POST   /api/artifacts/components      # Create component
GET    /api/artifacts/components/:id  # Get component with HTML
PUT    /api/artifacts/components/:id  # Update component
DELETE /api/artifacts/components/:id  # Delete component
GET    /api/artifacts/components/:id/preview  # Get rendered preview HTML
```

**Component Schema:**
```typescript
interface UIComponent {
  id: string;
  name: string;
  type: 'page' | 'component';
  html: string;                    // Tailwind-styled HTML
  description: string;
  featureRefs: string[];           // Which features use this
  createdAt: string;
  updatedAt: string;
}
```

### Tasks (F8)

```
GET    /api/features/:id/tasks        # Get all tasks for feature
PATCH  /api/features/:id/tasks/:taskId  # Update task status
POST   /api/features/:id/tasks/regenerate  # Regenerate tasks from implementation plan
```

**Update Task Request:**
```typescript
interface UpdateTaskRequest {
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}
```

**Tasks Response:**
```typescript
interface TasksResponse {
  tasks: Task[];
  progress: TaskProgress;
}
```

### Checklist (F10)

```
GET    /api/features/:id/checklist       # Get implementation checklist
PATCH  /api/features/:id/checklist/:itemId  # Update checklist item
POST   /api/features/:id/checklist/regenerate  # Regenerate from acceptance criteria
```

**Update Checklist Request:**
```typescript
interface UpdateChecklistRequest {
  verified: boolean;
  notes?: string;
}
```

**Checklist Response:**
```typescript
interface ChecklistResponse {
  items: ChecklistItem[];
  progress: ChecklistProgress;
}
```

### Constitution (F6)

```
GET    /api/constitution                 # Get project constitution
PUT    /api/constitution                 # Update constitution
DELETE /api/constitution                 # Remove constitution
POST   /api/constitution/validate        # Validate constitution schema
```

**Constitution Schema:**
```typescript
interface Constitution {
  version: string;
  principles: string[];
  coding: CodingStandards;
  security: SecurityRequirements;
  ux: UXPatterns;
  constraints: TechConstraints;
  hooks: AgentHooks;
  createdAt: string;
  updatedAt: string;
}

interface CodingStandards {
  naming: {
    functions: string;
    classes: string;
    database_tables: string;
    database_columns: string;
  };
  style: {
    max_function_length: number;
    require_docstrings: boolean;
    prefer_composition: boolean;
  };
}

interface SecurityRequirements {
  authentication: string;
  authorization: string;
  input_validation: string;
  secrets: string;
  password_hashing?: string;
}

interface UXPatterns {
  error_format: string;
  loading_states: string;
  accessibility: string;
  responsive?: string;
}

interface TechConstraints {
  allowed_libraries: string[];
  forbidden_libraries: string[];
  node_version: string;
  typescript?: string;
}

interface AgentHooks {
  onFeatureSave?: HookAction[];
  onSchemaChange?: HookAction[];
  preCommit?: HookAction[];
}

interface HookAction {
  action: 'validateSchema' | 'updateChecklist' | 'regenerateAPIs' | 'runAnalyzer' | 'updateProgress';
  options?: Record<string, any>;
}
```

### Analyzer (F9)

```
POST   /api/analyze                      # Run consistency analyzer
GET    /api/analyze/results/:id          # Get analysis results
GET    /api/analyze/history              # Get analysis history
```

**Analyze Request:**
```typescript
interface AnalyzeRequest {
  scope: 'project' | 'module' | 'feature';
  targetId?: string;                 // Required if scope is module or feature
  checks?: AnalysisCheck[];          // Specific checks to run, or all if omitted
}

type AnalysisCheck =
  | 'schema_consistency'
  | 'api_coverage'
  | 'missing_refs'
  | 'orphan_artifacts'
  | 'duplicate_definitions'
  | 'naming_conventions'
  | 'constitution_compliance';
```

**Analysis Results:**
```typescript
interface AnalysisResults {
  id: string;
  scope: string;
  targetId?: string;
  ranAt: string;
  duration: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  issues: AnalysisIssue[];
}

interface AnalysisIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: AnalysisCheck;
  message: string;
  location: {
    file: string;
    line?: number;
    artifactId?: string;
  };
  suggestion?: string;
  autoFixable: boolean;
}
```

### Lessons Learned (F11)

```
GET    /api/lessons                      # Get lessons learned entries
POST   /api/lessons                      # Add manual lesson
DELETE /api/lessons/:id                  # Remove lesson
```

**Lesson Schema:**
```typescript
interface Lesson {
  id: string;
  type: 'correction' | 'pattern' | 'constraint';
  context: string;                   // Where/when this applies
  problem: string;                   // What went wrong
  solution: string;                  // How to fix/avoid
  addedBy: 'ai' | 'user';
  addedAt: string;
  appliedCount: number;              // How often AI has used this
}
```

### Global Search (F1)

```
GET    /api/search                       # Search across all spec content
```

**Search Request (query params):**
- `q` (required): Search query string
- `types` (optional): Comma-separated artifact types to search (feature, entity, endpoint, component)
- `limit` (optional): Max results per type (default: 10)

**Search Response:**
```typescript
interface SearchResponse {
  query: string;
  results: {
    features: SearchResult[];
    entities: SearchResult[];
    endpoints: SearchResult[];
    components: SearchResult[];
  };
  totalCount: number;
}

interface SearchResult {
  id: string;
  type: 'feature' | 'entity' | 'endpoint' | 'component';
  name: string;
  matchedText: string;               // Text snippet with match highlighted
  location: string;                  // File path or artifact path
}
```

### Artifact History (F3)

```
GET    /api/artifacts/:type/:id/history  # Get change history for artifact
```

**History Response:**
```typescript
interface HistoryResponse {
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  entries: HistoryEntry[];
}

interface HistoryEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  actor: 'user' | 'workflow:cpo-phase' | 'workflow:cto-phase' | 'workflow:clarify-phase' | 'workflow:re' | 'generator:schema' | 'generator:api' | 'generator:component';
  changes: FieldChange[];
  reason?: string;
  timestamp: string;
}

interface FieldChange {
  field: string;
  from: any;
  to: any;
}
```

### Annotations (F5)

```
GET    /api/artifacts/:type/:id/annotations        # Get annotations for artifact
POST   /api/artifacts/:type/:id/annotations        # Add annotation
PATCH  /api/artifacts/:type/:id/annotations/:aid   # Update annotation
DELETE /api/artifacts/:type/:id/annotations/:aid   # Delete annotation
```

**Annotation Schema:**
```typescript
interface Annotation {
  id: string;
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  fieldPath: string;                 // JSON path to annotated field
  content: string;                   // Markdown content
  author: 'user' | 'workflow:cpo-phase' | 'workflow:cto-phase' | 'workflow:clarify-phase';
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}
```

**Create Annotation Request:**
```typescript
interface CreateAnnotationRequest {
  fieldPath: string;
  content: string;
}
```

### Cross-References (F4)

```
GET    /api/artifacts/:type/:id/references         # Get incoming/outgoing references
```

**References Response:**
```typescript
interface ReferencesResponse {
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  incoming: Reference[];             // Other artifacts that reference this one
  outgoing: Reference[];             // Artifacts this one references
}

interface Reference {
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  artifactName: string;
  relationshipType: 'uses' | 'exposes' | 'renders' | 'depends_on' | 'relates_to' | 'includes';
}
```

## Action Endpoints

### Workflow Operations

```
POST   /api/workflow/start             # Start a workflow
POST   /api/workflow/pause             # Pause current workflow
POST   /api/workflow/resume            # Resume from checkpoint
POST   /api/workflow/answer            # Submit answer to current question
POST   /api/workflow/skip              # Skip current question
POST   /api/workflow/retry             # Retry failed step
POST   /api/workflow/cancel            # Cancel current workflow
GET    /api/workflow/state             # Get current workflow state
GET    /api/workflow/stream            # SSE endpoint for workflow events

# Clarify-specific (within clarify workflow)
POST   /api/workflow/clarify/resolve   # Resolve an ambiguity
POST   /api/workflow/clarify/defer     # Defer ambiguity to CTO phase
POST   /api/workflow/clarify/skip-all  # Skip all clarifications

# Actualize workflow
POST   /api/workflow/actualize/start   # Start actualize workflow
GET    /api/workflow/actualize/:id     # Get actualize results
POST   /api/workflow/actualize/:id/apply  # Apply detected changes
```

**Start Workflow Request:**
```typescript
interface StartWorkflowRequest {
  projectId: string;
  workflowId: 'cpo-phase' | 'clarify-phase' | 'cto-phase' | 're-workflow' | 'actualize-workflow';
  mode?: 'new' | 'reverse';        // Required for initial start
  initialPrompt?: string;          // User's initial description
  targetPath?: string;             // For reverse engineering
}
```

**Workflow State Response:**
```typescript
interface WorkflowStateResponse {
  sessionId: string;
  workflowId: string;
  currentStepId: string;
  status: 'running' | 'paused' | 'waiting_user' | 'completed' | 'failed';
  currentTopic?: {
    id: string;
    name: string;
    questionIndex: number;
    totalQuestions: number;
  };
  progress: {
    topicsCompleted: number;
    totalTopics: number;
    percentComplete: number;
  };
  clarifyState?: {
    ambiguityCount: number;
    resolvedCount: number;
    deferredCount: number;
  };
  lastError?: string;
}
```

**Answer Request:**
```typescript
interface AnswerRequest {
  sessionId: string;
  questionId: string;
  answer: string | string[];       // Single or multiple choice
}
```

**Skip Question Request:**
```typescript
interface SkipRequest {
  sessionId: string;
  questionId: string;
}
```

**Retry Step Request:**
```typescript
interface RetryStepRequest {
  sessionId: string;
  stepId: string;
}
```

**Clarify Resolve Request:**
```typescript
interface ClarifyResolveRequest {
  sessionId: string;
  ambiguityId: string;
  resolution: string;              // User's clarification answer
}
```

**Clarify Defer Request:**
```typescript
interface ClarifyDeferRequest {
  sessionId: string;
  ambiguityId: string;
}
```

**Actualize Request:**
```typescript
interface ActualizeRequest {
  scope: 'project' | 'module' | 'feature';
  targetId?: string;
  options?: {
    includeNewFeatures?: boolean;
    includeRemovedFeatures?: boolean;
    includeSchemaChanges?: boolean;
    includeApiChanges?: boolean;
    autoMarkImplemented?: boolean;
  };
}
```

**Actualize Response:**
```typescript
interface ActualizeResponse {
  id: string;                          // For referencing results
  status: 'synced' | 'drift_detected';
  drift: {
    specToCode: DriftItem[];           // Spec vs code differences
    codeToSpec: DetectedFeature[];     // Code features not in spec
    schemaDrift: SchemaDriftItem[];
    apiDrift: ApiDriftItem[];
  };
  summary: {
    totalDriftItems: number;
    requiresAction: number;
  };
}
```

**SSE Events:**
```typescript
// Workflow step started
interface StepStartEvent {
  type: 'step_start';
  data: {
    stepId: string;
    stepType: 'code' | 'llm' | 'question' | 'conditional' | 'loop' | 'nested_workflow';
    description: string;
  };
}

// Workflow step completed
interface StepCompleteEvent {
  type: 'step_complete';
  data: {
    stepId: string;
    result?: any;
  };
}

// Question from workflow (waiting for user input)
interface QuestionEvent {
  type: 'question';
  data: {
    id: string;
    text: string;
    options: Option[];
    multiSelect: boolean;
    topicId: string;
    topicName: string;
    questionIndex: number;
    totalQuestions: number;
    phase: 'cpo' | 'clarify' | 'cto';
  };
}

// Spec update notification
interface SpecUpdateEvent {
  type: 'spec_update';
  data: {
    artifactType: 'schema' | 'api' | 'component' | 'feature';
    artifactId: string;
    action: 'create' | 'update' | 'delete';
  };
}

// Topic completed
interface TopicCompleteEvent {
  type: 'topic_complete';
  data: {
    topicId: string;
    topicName: string;
    questionsAnswered: number;
    nextTopicId?: string;
  };
}

// Phase/workflow transition
interface PhaseEvent {
  type: 'phase_change';
  data: {
    from: 'cpo-phase' | 'clarify-phase' | 'cto-phase';
    to: 'clarify-phase' | 'cto-phase' | 'complete';
  };
}

// Generator auto-invoked
interface GeneratorStartEvent {
  type: 'generator_start';
  data: {
    generatorType: 'schema' | 'api' | 'component';
    triggeredByTopic: string;
  };
}

// Generator completed
interface GeneratorCompleteEvent {
  type: 'generator_complete';
  data: {
    generatorType: 'schema' | 'api' | 'component';
    artifactsCreated: string[];
  };
}

// Clarify phase started
interface ClarifyStartEvent {
  type: 'clarify_start';
  data: {
    ambiguityCount: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

// Ambiguity detected
interface AmbiguityEvent {
  type: 'ambiguity';
  data: {
    id: string;
    type: 'vague_language' | 'missing_edge_case' | 'ambiguous_flow' | 'conflict';
    severity: 'high' | 'medium' | 'low';
    text: string;              // The problematic text
    context: string;           // Where it appears
    question: string;          // Clarification question
    options?: string[];        // Suggested answers
  };
}

// LLM step in progress
interface LLMProgressEvent {
  type: 'llm_progress';
  data: {
    stepId: string;
    message: string;
    tokensUsed?: number;
  };
}

// General progress update (for long operations)
interface ProgressEvent {
  type: 'progress';
  data: {
    message: string;
    percent?: number;
  };
}

// Step failed
interface StepErrorEvent {
  type: 'step_error';
  data: {
    stepId: string;
    message: string;
    retryable: boolean;
  };
}

// Workflow error
interface ErrorEvent {
  type: 'error';
  data: {
    message: string;
    retryable: boolean;
  };
}

// Workflow complete
interface CompleteEvent {
  type: 'complete';
  data: {
    workflowId: string;
    summary: string;
    nextWorkflowId?: string;   // Auto-transition to next workflow
  };
}
```

### Git Operations

```
GET    /api/git/status                # Get current git status
GET    /api/git/branches              # List branches
POST   /api/git/checkout              # Switch branch
POST   /api/git/commit                # Commit changes
POST   /api/git/pull                  # Pull from remote
POST   /api/git/push                  # Push to remote
GET    /api/git/conflicts             # Check for conflicts
```

**Git Status Response:**
```typescript
interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  hasConflicts: boolean;
}
```

**Commit Request:**
```typescript
interface CommitRequest {
  message: string;
  files?: string[];                // Specific files, or all if omitted
}
```

### History Operations

```
GET    /api/history/conversations     # List all conversations
GET    /api/history/conversations/:id # Get conversation detail
GET    /api/history/search            # Search conversation history
```

**Conversation Search Request:**
```typescript
interface ConversationSearchRequest {
  query: string;
  filters?: {
    phase?: 'cpo' | 'clarify' | 'cto';
    featureId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}
```

### Undo Operations

```
GET    /api/undo/status               # Get undo/redo availability
POST   /api/undo/undo                 # Undo last action
POST   /api/undo/redo                 # Redo last undone action
GET    /api/undo/history              # Get action history
```

**Undo Status Response:**
```typescript
interface UndoStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription?: string;        // What will be undone
  redoDescription?: string;        // What will be redone
}
```

---

**Note:** AI tool definitions and model selection are documented in [tools.md](tools.md).

## Error Responses

All endpoints return errors in consistent format:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: object;
  };
}
```

**Common Error Codes:**
- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Invalid request data
- `GIT_CONFLICT` - Git conflict detected
- `LLM_ERROR` - Claude SDK error in LLM step
- `FILE_ERROR` - Filesystem operation failed
- `WORKFLOW_ERROR` - Workflow execution error
- `STEP_ERROR` - Individual step failed
- `CHECKPOINT_ERROR` - Failed to save/restore checkpoint
- `CONSTITUTION_ERROR` - Constitution validation failed
- `ANALYSIS_ERROR` - Analyzer execution failed
- `CLARIFY_ERROR` - Clarify workflow error
- `GENERATOR_ERROR` - Generator workflow failed
- `HOOK_ERROR` - Hook execution failed
- `TIMEOUT_ERROR` - Step exceeded timeout
