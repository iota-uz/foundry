# Technical Architecture

**Status:** Draft

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Node.js | Required for npm distribution |
| Framework | Next.js 14+ (App Router) | Server components, API routes, file-based routing |
| Styling | Tailwind CSS v4 + Headless UI | Utility-first, accessible components |
| State | Zustand | Single source of truth, simple API |
| AI | Claude Code SDK | Native tool support, streaming |
| Diagrams | React Flow | Unified visualization for all diagram types |
| API Docs | Scalar | Modern API documentation UI |
| Storage | File System + SQLite | Specs as files, history in SQLite |
| Distribution | npm package | `npx foundry` or global install |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ foundry init│  │ foundry dev │  │ foundry serve       │ │
│  │ (setup)     │  │ (hot reload)│  │ (production bundle) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   App Router                           │ │
│  │  /                    → Dashboard                      │ │
│  │  /spec/new            → New Spec Wizard                │ │
│  │  /spec/reverse        → Reverse Engineer               │ │
│  │  /modules/[id]        → Module View                    │ │
│  │  /features/[id]       → Feature Detail                 │ │
│  │  /visualizations      → Tabbed Diagrams                │ │
│  │  /ui-library          → Component Gallery              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   API Routes                           │ │
│  │  /api/projects/*      → Project CRUD                   │ │
│  │  /api/modules/*       → Module CRUD                    │ │
│  │  /api/features/*      → Feature CRUD                   │ │
│  │  /api/artifacts/*     → Schema/API/Component CRUD      │ │
│  │  /api/workflow/start  → Start new workflow             │ │
│  │  /api/workflow/pause  → Pause current workflow         │ │
│  │  /api/workflow/resume → Resume from checkpoint         │ │
│  │  /api/workflow/answer → Submit answer to question      │ │
│  │  /api/workflow/retry  → Retry failed step              │ │
│  │  /api/workflow/stream → SSE endpoint for workflow      │ │
│  │  /api/analyze/*       → Consistency analyzer           │ │
│  │  /api/constitution    → Constitution CRUD              │ │
│  │  /api/lessons/*       → Lessons learned                │ │
│  │  /api/git/*           → Git operations                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ SpecService   │  │WorkflowEngine │  │ GitService     │  │
│  │ - CRUD ops    │  │ - Step exec   │  │ - branch/commit│  │
│  │ - Validation  │  │ - State mgmt  │  │ - push/pull    │  │
│  │ - File sync   │  │ - Checkpoints │  │ - conflict det │  │
│  └───────────────┘  │ - Recovery    │  └────────────────┘  │
│                     └───────────────┘                       │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │QuestionGen    │  │ LLMService    │  │ FileService    │  │
│  │  Service      │  │ - Claude SDK  │  │ - Read/write   │  │
│  │ - Topic ctx   │  │ - Bounded call│  │ - Watch        │  │
│  │ - AI generate │  │ - Structured  │  │                │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │HistoryService │  │ UndoService   │  │ HookService    │  │
│  │ - SQLite ops  │  │ - State stack │  │ - Event listen │  │
│  │ - Search      │  │ - Persistence │  │ - Action exec  │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │AnalyzerService│  │Constitution   │  │ LessonsService │  │
│  │ - Consistency │  │   Service     │  │ - AI feedback  │  │
│  │ - Validation  │  │ - Load/save   │  │ - User entries │  │
│  │ - Reporting   │  │ - Validate    │  │ - Retrieval    │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
│  ┌───────────────┐                                          │
│  │ TaskService   │                                          │
│  │ - Task CRUD   │                                          │
│  │ - Progress    │                                          │
│  │ - Checklist   │                                          │
│  └───────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                            │
│  ┌─────────────────────────┐  ┌──────────────────────────┐ │
│  │     File System         │  │      SQLite              │ │
│  │  .foundry/              │  │  .foundry/foundry.db     │ │
│  │  ├── project.yaml       │  │  - workflow_checkpoints  │ │
│  │  ├── constitution.yaml  │  │  - undo_history          │ │
│  │  ├── lessons-learned.md │  │  - analysis_results      │ │
│  │  ├── modules/           │  │                          │ │
│  │  ├── features/          │  │                          │ │
│  │  ├── schemas/           │  │                          │ │
│  │  ├── apis/              │  │                          │ │
│  │  └── components/        │  │                          │ │
│  └─────────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## CLI Architecture

### Commands

```bash
# Initialize new project
foundry init

# Start development server (hot reload)
foundry dev [--port 3000]

# Start production server (bundled assets)
foundry serve [--port 3000]

# Open existing project
foundry open [path]
```

### Hybrid Launch Mode

**Development Mode (`foundry dev`):**
- Runs Next.js dev server
- Hot module replacement enabled
- Source maps for debugging
- Slower initial start, fast iteration

**Production Mode (`foundry serve`):**
- Serves pre-built static assets
- Express server for API routes
- Fast startup time
- No hot reload

## AI Integration

**See also:**
- [research/claude-agent-sdk.md](research/claude-agent-sdk.md) - Integration patterns and capabilities
- [research/claude-agent-sdk-apis.md](research/claude-agent-sdk-apis.md) - Complete API reference

### Workflow Architecture

Foundry uses a **workflow-based** architecture instead of agent-based. This provides deterministic execution, bounded LLM calls, and reliable pause/resume capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│              Main Orchestration (Pure Code)                 │
│  - State machine routing                                    │
│  - No LLM orchestration                                     │
│  - Phase transitions based on workflow completion           │
└─────────────────────────────────────────────────────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│  CPO Workflow   │ │Clarify       │ │CTO Workflow │ │ RE Workflow │
│  (8 topics)     │ │Workflow      │ │ (8 topics)  │ │ (6 steps)   │
│                 │ │              │ │             │ │             │
│ - AI questions  │ │ - Scan(code) │ │ - AI ques.  │ │ - Discover  │
│ - Within topic  │ │ - Categorize │ │ - Auto-gen  │ │ - Analyze   │
│   constraints   │ │   (LLM)      │ │   schemas   │ │ - Extract   │
│ - UpdateSpec    │ │ - Resolve    │ │ - Auto-gen  │ │ - Compile   │
│   after each    │ │   loop       │ │   APIs      │ │             │
└─────────────────┘ └──────────────┘ └─────────────┘ └─────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │   Generator Workflows   │
                              │  ┌──────┐ ┌──────┐     │
                              │  │Schema│ │ API  │     │
                              │  │Gen   │ │Gen   │     │
                              │  └──────┘ └──────┘     │
                              │  ┌──────┐              │
                              │  │Comp. │              │
                              │  │Gen   │              │
                              │  └──────┘              │
                              └─────────────────────────┘
```

**Phase Flow:**
```
CPO Workflow → (auto) → Clarify Workflow → CTO Workflow
                              │
                              ▼
                      [User resolves/defers
                       ambiguities]

CTO Workflow auto-invokes generators after relevant topics:
  - Data Model topic → Schema Generator Workflow
  - API Design topic → API Generator Workflow
  - UI Components topic → Component Generator Workflow
```

### WorkflowEngine Service

The WorkflowEngine is the core service that executes workflow steps:

```typescript
interface WorkflowEngine {
  // Execute a workflow from the beginning or current checkpoint
  execute(workflowId: string, sessionId: string): Promise<WorkflowResult>;

  // Pause at current step
  pause(sessionId: string): Promise<void>;

  // Resume from checkpoint
  resume(sessionId: string): Promise<WorkflowResult>;

  // Get current state
  getState(sessionId: string): Promise<WorkflowState>;

  // Retry failed step
  retryStep(sessionId: string, stepId: string): Promise<WorkflowResult>;
}

// Step execution handlers
interface StepExecutor {
  executeCode(step: CodeStep, ctx: WorkflowContext): Promise<StepResult>;
  executeLLM(step: LLMStep, ctx: WorkflowContext): Promise<StepResult>;
  executeQuestion(step: QuestionStep, ctx: WorkflowContext): Promise<StepResult>;
  executeLoop(step: LoopStep, ctx: WorkflowContext): Promise<StepResult>;
  executeConditional(step: ConditionalStep, ctx: WorkflowContext): Promise<StepResult>;
  executeNestedWorkflow(step: NestedWorkflowStep, ctx: WorkflowContext): Promise<StepResult>;
}
```

**Checkpoint Strategy:**
- Checkpoint saved after each step completion
- On failure: state preserved at failed step
- On resume: re-execute from checkpoint
- Each LLM step has explicit timeout and retry policy

### Communication Flow (SSE)

```
Browser                    Server                   WorkflowEngine
   │                          │                          │
   │── POST /api/workflow/start ──►│                     │
   │                          │──── Execute workflow ────►│
   │◄── SSE /api/workflow/stream ──│                     │
   │                          │◄─── Step: question ──────│
   │◄── event: question ──────│                          │
   │                          │                          │
   │── POST /api/workflow/answer ──►│                    │
   │                          │──── Answer + continue ───►│
   │                          │◄─── Step: llm ───────────│
   │◄── event: generating ────│                          │
   │                          │◄─── Step: update_spec ───│
   │◄── event: spec_update ───│                          │
   │                          │                          │
```

### Workflow Step Types

| Step Type | Behavior | LLM Involvement |
|-----------|----------|-----------------|
| `code` | Execute pure code function | None |
| `llm` | Single bounded LLM call with structured output | Yes (bounded) |
| `question` | Present question to user, wait for answer | Optional (AI-generated question) |
| `conditional` | Branch based on data/condition | None |
| `loop` | Iterate over collection | None |
| `nested_workflow` | Execute another workflow as a step | Depends on child workflow |

### LLM Service Operations

Operations that invoke Claude SDK with bounded calls. All prompts loaded from `.foundry/prompts/` and compiled with Handlebars before execution.

| Operation | Purpose | Model | Prompt Files | Used In |
|-----------|---------|-------|--------------|---------|
| GenerateQuestion | Create conversational question | Sonnet | cpo/cto-generate-question-*.hbs | CPO/CTO question steps |
| CategorizeAmbiguity | Classify severity, generate questions | Sonnet | clarify-categorize-*.hbs | Clarify workflow |
| GenerateSchema | Create DBML from answers | Sonnet | schema-generator-*.hbs | Schema Generator |
| GenerateAPI | Create OpenAPI/GraphQL spec | Sonnet | api-generator-*.hbs | API Generator |
| GenerateComponent | Create UI component | Sonnet | component-generator-*.hbs | Component Generator |
| AnalyzeArchitecture | Deep code analysis | Opus | re-analyze-architecture-*.hbs | RE workflow |
| ExtractFeatures | Identify features from code | Opus | re-extract-features-*.hbs | RE workflow |
| SemanticCompare | Determine spec/code equivalence | Opus | actualize-semantic-compare-*.hbs | Actualize workflow |

### Code-Only Operations

Operations handled by pure code steps (no LLM):

| Operation | Purpose | Used In |
|-----------|---------|---------|
| FileRead | Read codebase files | RE workflow, Analyzer |
| FileWrite | Write spec files | All workflows |
| GlobFiles | Find files by pattern | RE workflow |
| DetectAmbiguity | Regex scan for vague language | Clarify workflow |
| ComputeDiff | Structural comparison | Actualize workflow |
| UpdateSpec | Merge answer into spec | CPO/CTO workflows |
| RunAnalyzer | Execute consistency checks | Analyzer workflow |
| ReadConstitution | Load project constitution | All workflows |

### Prompt Management

#### PromptService

Handles loading and compiling Handlebars prompt templates:

```typescript
interface PromptService {
  // Load and compile a prompt template
  compilePrompt(
    promptFile: string,          // Filename (e.g., "cpo-generate-question-system.hbs")
    context: Record<string, any> // Workflow state
  ): Promise<string>;

  // Clear cache (for development/testing)
  clearCache(): void;
}
```

**Implementation Notes:**
- Prompt files loaded from `.foundry/prompts/{promptFile}`
- Handlebars compilation uses workflow state as context
- Templates cached in memory for performance
- Constitution injection happens after Handlebars compilation

**Example usage:**
```typescript
const systemPrompt = await promptService.compilePrompt(
  step.systemPromptFile,
  workflowState.data
);

const userPrompt = await promptService.compilePrompt(
  step.userPromptFile,
  workflowState.data
);

// Append constitution
const finalSystemPrompt = buildLLMPrompt(systemPrompt, constitution);

// Call Claude
const response = await llmService.call(finalSystemPrompt, userPrompt, {
  model: step.model,
  outputSchema: step.outputSchema
});
```

## Visualization Architecture

### Unified React Flow Approach

All diagram types use React Flow for consistent UX:

**DBML Renderer:**
- Parse DBML → Node/Edge graph
- Table nodes with field details
- Relationship edges with cardinality
- Auto-layout with dagre

**GraphQL Renderer:**
- Parse GraphQL schema → Node/Edge graph
- Type nodes (Query, Mutation, Object, Input)
- Field relationship edges
- Collapsible complex types

**Data Flow Renderer:**
- Custom nodes: User Input, Service, Database, External API
- Animated edges showing data direction
- Layer-based layout (presentation → service → data)

## State Management

### Zustand Store Structure

```typescript
interface FoundryStore {
  // Project state
  project: Project | null;
  modules: Module[];
  features: Feature[];
  constitution: Constitution | null;

  // UI state
  activeView: ViewType;
  selectedFeatureId: string | null;
  sidebarCollapsed: boolean;

  // Workflow state
  workflowState: WorkflowState | null;
  currentQuestion: Question | null;

  // Analyzer state
  analysisResults: AnalysisResults | null;
  isAnalyzing: boolean;

  // Git state
  gitBranch: string;
  gitStatus: GitStatus;
  hasUncommittedChanges: boolean;

  // Workflow actions
  startWorkflow: (workflowId: WorkflowId, mode: 'new' | 'reverse') => Promise<void>;
  pauseWorkflow: () => Promise<void>;
  resumeWorkflow: () => Promise<void>;
  answerQuestion: (answer: Answer) => Promise<void>;
  retryStep: (stepId: string) => Promise<void>;

  // Clarify actions
  resolveAmbiguity: (id: string, resolution: string) => Promise<void>;
  deferAmbiguity: (id: string) => Promise<void>;

  // Other actions
  loadProject: (path: string) => Promise<void>;
  saveProject: () => Promise<void>;
  runAnalyzer: (scope: AnalysisScope) => Promise<void>;
  updateTaskStatus: (featureId: string, taskId: string, status: TaskStatus) => Promise<void>;
  verifyChecklistItem: (featureId: string, itemId: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
}

interface WorkflowState {
  sessionId: string;
  workflowId: 'cpo-phase' | 'clarify-phase' | 'cto-phase' | 're-workflow' | 'actualize-workflow';
  currentStepId: string;
  status: 'running' | 'paused' | 'waiting_user' | 'completed' | 'failed';
  currentTopicIndex: number;
  currentQuestionIndex: number;
  data: Record<string, any>;         // Accumulated step outputs
  clarifyState: ClarifyState | null; // Active during clarify phase
  history: StepExecution[];          // For debugging/rollback
  checkpoint: string;
  startedAt: string;
  lastActivityAt: string;
}

interface ClarifyState {
  ambiguities: Ambiguity[];
  currentIndex: number;
  resolvedCount: number;
  deferredCount: number;
  status: 'scanning' | 'categorizing' | 'resolving' | 'complete';
}

interface StepExecution {
  stepId: string;
  status: 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt: string;
  result?: any;
  error?: string;
}
```

### Cognitive Load Reduction State Extensions

The following state slices extend the core Zustand store to support the 7 cognitive load reduction features:

```typescript
interface FoundryStore {
  // ... existing state ...

  // Feature 1: Question Batching State
  batchingState: {
    batches: QuestionBatch[];
    currentBatchIndex: number;
    currentQuestionIndex: number;
    mode: 'batch' | 'sequential';
  } | null;

  // Feature 2: Live Spec Preview State
  livePreview: {
    enabled: boolean;
    position: 'right' | 'bottom';
    activeArtifact: string | null;
    pendingChanges: SpecChange[];
    diffMode: 'unified' | 'split' | 'highlight';
    detailLevel: 'summary' | 'diff' | 'full';
  };

  // Feature 3: AI Recommendations State
  recommendations: {
    enabled: boolean;
    showReasoningByDefault: boolean;
  };

  // Feature 4: Decision Journal State
  decisionJournal: {
    visible: boolean;
    filter: 'all' | 'feature' | 'phase';
    filterValue: string | null;
    selectedDecisionId: string | null;
    undoPreview: CascadePreview | null;
  };

  // Feature 7: Impact Preview State
  impactPreview: {
    enabled: boolean;
    hoveredOptionId: string | null;
    preview: ImpactPreview | null;
    loading: boolean;
    cache: Map<string, ImpactPreview>;
  };

  // Feature 9: Explainer State
  explainerState: {
    showByDefault: boolean;
    expandedQuestionIds: Set<string>;
  };

  // Feature 10: Keyboard Shortcuts State
  keyboardState: {
    enabled: boolean;
    showShortcutHints: boolean;
    shortcutContext: 'global' | 'qa_single' | 'qa_multi' | 'qa_text' | 'qa_batch';
  };

  // Feature 1: Batching Actions
  setNextBatch: () => void;
  answerBatchQuestion: (questionId: string, answer: any) => void;
  completeBatch: () => void;
  skipRemainingInBatch: () => void;

  // Feature 2: Live Preview Actions
  toggleLivePreview: () => void;
  setPreviewArtifact: (id: string | null) => void;
  setPreviewPosition: (position: 'right' | 'bottom') => void;
  setDetailLevel: (level: 'summary' | 'diff' | 'full') => void;

  // Feature 4: Decision Journal Actions
  toggleDecisionJournal: () => void;
  setDecisionFilter: (filter: 'all' | 'feature' | 'phase', value?: string) => void;
  selectDecision: (id: string | null) => void;
  undoToDecision: (id: string) => Promise<void>;
  previewUndoToDecision: (id: string) => Promise<CascadePreview>;

  // Feature 7: Impact Preview Actions
  setHoveredOption: (questionId: string, optionId: string | null) => void;
  preloadImpactPreviews: (questionId: string, optionIds: string[]) => void;

  // Feature 9: Explainer Actions
  toggleExplainer: (questionId: string) => void;
  setShowExplainersByDefault: (show: boolean) => void;

  // Feature 10: Keyboard Actions
  toggleKeyboardShortcuts: () => void;
  toggleShortcutHints: () => void;
  setShortcutContext: (context: 'global' | 'qa_single' | 'qa_multi' | 'qa_text' | 'qa_batch') => void;
}

// Supporting interfaces for cognitive load features

interface QuestionBatch {
  id: string;
  topic: string;
  topicDescription: string;
  questions: BatchQuestion[];
  estimatedTimeMinutes: number;
  batchPosition: { current: number; total: number; phase: Phase };
}

interface BatchQuestion {
  question: AIQuestion;
  required: boolean;
  dependsOn?: { questionId: string; condition: 'answered' | 'equals' | 'not_equals'; value?: any };
  answered: boolean;
  answer?: any;
}

interface SpecChange {
  section: string;
  operation: 'add' | 'modify' | 'remove';
  path: string;
  beforeValue?: any;
  afterValue?: any;
  confidence: 'definite' | 'inferred' | 'placeholder';
  sourceQuestionId?: string;
}

interface ImpactPreview {
  summary: string;
  specChanges: { sections: string[]; estimatedFields: number };
  additionalQuestions: { estimate: number; topics: string[] };
  dependencies: { creates: string[]; removes: string[] };
  pros: string[];
  cons: string[];
  reversibility: 'easy' | 'moderate' | 'significant';
}

interface CascadePreview {
  decisionsToUndo: Decision[];
  artifactsAffected: { type: string; id: string; changes: string[] }[];
  warnings: string[];
  canProceed: boolean;
}
```

### Cognitive Load SSE Events

Additional SSE events for real-time cognitive load features:

```typescript
// Feature 1: Question Batching Events
{ type: 'batch', data: QuestionBatch }
{ type: 'batch_question_answered', data: { batchId: string; questionId: string; remaining: number } }
{ type: 'batch_complete', data: { batchId: string; nextBatchId: string | null } }

// Feature 2: Live Spec Preview Events
{ type: 'spec_update', data: {
  artifactType: 'feature' | 'schema' | 'api' | 'component';
  artifactId: string;
  changes: SpecChange[];
  preview: { before: string; after: string; format: 'yaml' | 'dbml' | 'openapi' | 'html' };
}}
{ type: 'spec_preview_chunk', data: { artifactId: string; chunk: string; isComplete: boolean } }
{ type: 'spec_preview_pending', data: { artifactId: string; changes: SpecChange[] } }
{ type: 'spec_preview_commit', data: { artifactId: string; committedChanges: string[] } }

// Feature 3: AI Recommendation Events
{ type: 'recommendation_ready', data: {
  questionId: string;
  recommendedOptionId: string;
  confidence: 'high' | 'medium';
  reasoning: string;
  source: string;
}}

// Feature 4: Decision Journal Events
{ type: 'decision_logged', data: Decision }
{ type: 'decisions_undone', data: {
  undoneIds: string[];
  restoredArtifacts: { type: string; id: string }[];
  newState: 'running' | 'waiting_user';
}}

// Feature 7: Impact Preview Events
{ type: 'impact_preview_ready', data: {
  questionId: string;
  optionId: string;
  preview: ImpactPreview;
}}
{ type: 'impact_preview_invalidated', data: { questionId: string } }
```

## Error Handling

### AI Failures
- Show error immediately with details
- Provide "Retry" button
- Log to conversation history for debugging
- No auto-retry (user controls retry)

### Git Conflicts
- Detect conflicts before save
- Block save operation
- Display conflict resolution guide
- Link to external merge tool instructions

### Workflow Recovery
- Full workflow state checkpointed to SQLite after each step
- On browser close: state saved automatically at current step
- On reopen: exact state restored, can resume from checkpoint
- Step-level granularity allows retry of individual steps
- Timeout detection: if step exceeds timeout, marked as failed

## Performance Considerations

### Large Codebase Analysis
- Progressive streaming of results
- Incremental UI updates as artifacts discovered
- Cancelable analysis operation
- Memory-efficient file processing

### Visualization Performance
- React Flow virtualization for large diagrams
- Lazy loading of node details
- Debounced layout recalculation
- Canvas-based rendering for 100+ nodes

## Hooks Architecture

### Event System

```
┌─────────────────────────────────────────────────────────────┐
│                    HookService                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  Event Emitter                          ││
│  │  onFeatureSave → [validateSchema, updateChecklist]      ││
│  │  onSchemaChange → [regenerateAPIs]                      ││
│  │  preCommit → [runAnalyzer]                              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Action Executor                          │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │validateSchema │  │updateChecklist│  │ regenerateAPIs │  │
│  │ - DBML parse  │  │ - Criteria    │  │ - OpenAPI sync │  │
│  │ - Ref check   │  │ - Auto-verify │  │ - GraphQL sync │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
│  ┌───────────────┐                                          │
│  │  runAnalyzer  │                                          │
│  │ - Full check  │                                          │
│  │ - Block/warn  │                                          │
│  └───────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### Hook Configuration (constitution.yaml)

```yaml
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

### Hook Execution Flow

1. **Event Triggered** - User action or AI operation
2. **Load Configuration** - Read hooks from constitution.yaml
3. **Execute Actions** - Run each action in sequence
4. **Handle Failures** - Based on `failOnError` setting:
   - If true: Block operation, show error
   - If false: Log warning, continue
5. **Report Results** - Show hook execution status in UI

### Available Hook Events

| Event | Triggered When |
|-------|----------------|
| `onFeatureSave` | Feature file saved (manual or AI) |
| `onSchemaChange` | DBML schema modified |
| `onAPIChange` | OpenAPI or GraphQL spec modified |
| `onComponentChange` | UI component HTML modified |
| `preCommit` | Before git commit operation |

### Available Hook Actions

| Action | Description |
|--------|-------------|
| `validateSchema` | Validate DBML syntax and references |
| `updateChecklist` | Sync checklist with acceptance criteria |
| `regenerateAPIs` | Update API specs from schema changes |
| `runAnalyzer` | Run full consistency analyzer |
| `notifyUser` | Show toast notification |
