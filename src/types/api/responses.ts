/**
 * API response types
 */

import type {
  Project,
  Module,
  Feature,
  UIComponent,
  SchemaArtifact,
  OpenAPIArtifact,
  GraphQLArtifact,
  Constitution,
  TaskProgress,
  Task,
  ChecklistProgress,
  ChecklistItem,
} from '../domain';

import type { WorkflowId } from '../workflow';

// ============================================================================
// List Responses
// ============================================================================

export interface ProjectsResponse {
  projects: Project[];
}

export interface ModulesResponse {
  modules: Module[];
}

export interface FeaturesResponse {
  features: Feature[];
}

export interface ComponentsResponse {
  components: UIComponent[];
}

// ============================================================================
// Single Resource Responses
// ============================================================================

export interface ProjectResponse {
  project: Project;
}

export interface ModuleResponse {
  module: Module;
  features: Feature[];
}

export interface FeatureResponse {
  feature: Feature;
}

export interface ComponentResponse {
  component: UIComponent;
}

export interface ConstitutionResponse {
  constitution: Constitution;
}

// ============================================================================
// Artifact Responses
// ============================================================================

export interface SchemaResponse {
  schema: SchemaArtifact;
}

export interface OpenAPIResponse {
  openapi: OpenAPIArtifact;
}

export interface GraphQLResponse {
  graphql: GraphQLArtifact;
}

export interface EndpointsResponse {
  endpoints: Array<{
    id: string;
    type: 'rest' | 'graphql';
    method?: string;
    path?: string;
    operation?: string;
    description: string;
    featureRefs: string[];
  }>;
}

// ============================================================================
// Task Responses
// ============================================================================

export interface TasksResponse {
  tasks: Task[];
  progress: TaskProgress;
}

// ============================================================================
// Checklist Responses
// ============================================================================

export interface ChecklistResponse {
  items: ChecklistItem[];
  progress: ChecklistProgress;
}

// ============================================================================
// Workflow Responses
// ============================================================================

export interface WorkflowStateResponse {
  sessionId: string;
  workflowId: WorkflowId;
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

// ============================================================================
// Analysis Responses
// ============================================================================

export interface AnalysisResults {
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

export interface AnalysisIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location: {
    file: string;
    line?: number;
    artifactId?: string;
  };
  suggestion?: string;
  autoFixable: boolean;
}

export interface AnalysisHistoryResponse {
  history: Array<{
    id: string;
    scope: string;
    ranAt: string;
    summary: {
      errors: number;
      warnings: number;
      info: number;
    };
  }>;
}

// ============================================================================
// Actualize Responses
// ============================================================================

export interface ActualizeResponse {
  id: string;
  status: 'synced' | 'drift_detected';
  drift: {
    specToCode: DriftItem[];
    codeToSpec: DetectedFeature[];
    schemaDrift: SchemaDriftItem[];
    apiDrift: ApiDriftItem[];
  };
  summary: {
    totalDriftItems: number;
    requiresAction: number;
  };
}

export interface DriftItem {
  type: 'feature' | 'schema' | 'api';
  id: string;
  specState: unknown;
  codeState: unknown;
  diff: string;
}

export interface DetectedFeature {
  name: string;
  description: string;
  files: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface SchemaDriftItem {
  table: string;
  field?: string;
  issue: string;
}

export interface ApiDriftItem {
  endpoint: string;
  method?: string;
  issue: string;
}

// ============================================================================
// History Responses
// ============================================================================

export interface HistoryResponse {
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  entries: HistoryEntry[];
}

export interface HistoryEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  actor: string;
  changes: FieldChange[];
  reason?: string;
  timestamp: string;
}

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

// ============================================================================
// Annotation Responses
// ============================================================================

export interface AnnotationsResponse {
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  fieldPath: string;
  content: string;
  author: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

// ============================================================================
// Reference Responses
// ============================================================================

export interface ReferencesResponse {
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  incoming: Reference[];
  outgoing: Reference[];
}

export interface Reference {
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  artifactName: string;
  relationshipType: 'uses' | 'exposes' | 'renders' | 'depends_on' | 'relates_to' | 'includes';
}

// ============================================================================
// Lesson Responses
// ============================================================================

export interface LessonsResponse {
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  type: 'correction' | 'pattern' | 'constraint';
  context: string;
  problem: string;
  solution: string;
  addedBy: 'ai' | 'user';
  addedAt: string;
  appliedCount: number;
}

// ============================================================================
// Search Responses
// ============================================================================

export interface SearchResponse {
  query: string;
  results: {
    features: SearchResult[];
    entities: SearchResult[];
    endpoints: SearchResult[];
    components: SearchResult[];
  };
  totalCount: number;
}

export interface SearchResult {
  id: string;
  type: 'feature' | 'entity' | 'endpoint' | 'component';
  name: string;
  matchedText: string;
  location: string;
}

// ============================================================================
// Git Responses
// ============================================================================

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  hasConflicts: boolean;
}

export interface GitBranchesResponse {
  branches: string[];
  current: string;
}

// ============================================================================
// Undo Responses
// ============================================================================

export interface UndoStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription?: string;
  redoDescription?: string;
}

export interface UndoHistoryResponse {
  actions: Array<{
    id: string;
    actionType: 'create' | 'update' | 'delete';
    targetType: string;
    targetId: string;
    description: string;
    createdAt: string;
    undoneAt?: string;
  }>;
}

// ============================================================================
// Generic Success Response
// ============================================================================

export interface SuccessResponse {
  success: boolean;
  message?: string;
}
