/**
 * API request types
 */

import type { WorkflowId } from '../workflow';

// ============================================================================
// Project Requests
// ============================================================================

export interface CreateProjectRequest {
  name: string;
  description: string;
  path: string;
  mode: 'new' | 'reverse_engineered';
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  settings?: {
    defaultBranch?: string;
    autoSave?: boolean;
    autoCommit?: boolean;
  };
}

// ============================================================================
// Module Requests
// ============================================================================

export interface CreateModuleRequest {
  projectId: string;
  name: string;
  description: string;
  order?: number;
}

export interface UpdateModuleRequest {
  name?: string;
  description?: string;
  order?: number;
}

// ============================================================================
// Feature Requests
// ============================================================================

export interface CreateFeatureRequest {
  moduleId: string;
  name: string;
  description: string;
  source?: 'new' | 'reverse_engineered';
}

export interface UpdateFeatureRequest {
  name?: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'completed';
  business?: {
    userStory?: string;
    acceptanceCriteria?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface AddFeatureDependencyRequest {
  dependsOnFeatureId: string;
}

// ============================================================================
// Task Requests
// ============================================================================

export interface UpdateTaskRequest {
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

// ============================================================================
// Checklist Requests
// ============================================================================

export interface UpdateChecklistRequest {
  verified: boolean;
  notes?: string;
}

// ============================================================================
// Component Requests
// ============================================================================

export interface CreateComponentRequest {
  name: string;
  type: 'page' | 'component';
  html: string;
  description: string;
}

export interface UpdateComponentRequest {
  name?: string;
  html?: string;
  description?: string;
}

// ============================================================================
// Constitution Requests
// ============================================================================

export interface UpdateConstitutionRequest {
  principles?: string[];
  coding?: {
    naming?: Record<string, string>;
    style?: Record<string, any>;
  };
  security?: Record<string, any>;
  ux?: Record<string, any>;
  constraints?: {
    allowed_libraries?: string[];
    forbidden_libraries?: string[];
    node_version?: string;
    typescript?: string;
  };
  hooks?: Record<string, any[]>;
}

// ============================================================================
// Workflow Requests
// ============================================================================

export interface StartWorkflowRequest {
  projectId: string;
  workflowId: WorkflowId;
  mode?: 'new' | 'reverse';
  initialPrompt?: string;
  targetPath?: string; // For reverse engineering
}

export interface AnswerRequest {
  sessionId: string;
  questionId: string;
  answer: string | string[]; // Single or multiple choice
}

export interface SkipRequest {
  sessionId: string;
  questionId: string;
}

export interface RetryStepRequest {
  sessionId: string;
  stepId: string;
}

export interface ClarifyResolveRequest {
  sessionId: string;
  ambiguityId: string;
  resolution: string;
}

export interface ClarifyDeferRequest {
  sessionId: string;
  ambiguityId: string;
}

// ============================================================================
// Analyzer Requests
// ============================================================================

export interface AnalyzeRequest {
  scope: 'project' | 'module' | 'feature';
  targetId?: string;
  checks?: AnalysisCheck[];
}

export type AnalysisCheck =
  | 'schema_consistency'
  | 'api_coverage'
  | 'missing_refs'
  | 'orphan_artifacts'
  | 'duplicate_definitions'
  | 'naming_conventions'
  | 'constitution_compliance';

// ============================================================================
// Actualize Requests
// ============================================================================

export interface ActualizeRequest {
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

// ============================================================================
// Annotation Requests
// ============================================================================

export interface CreateAnnotationRequest {
  artifactType: 'feature' | 'entity' | 'endpoint' | 'component';
  artifactId: string;
  fieldPath: string;
  content: string;
}

export interface UpdateAnnotationRequest {
  content?: string;
  status?: 'open' | 'resolved';
}

// ============================================================================
// Lesson Requests
// ============================================================================

export interface CreateLessonRequest {
  type: 'correction' | 'pattern' | 'constraint';
  context: string;
  problem: string;
  solution: string;
}

// ============================================================================
// Git Requests
// ============================================================================

export interface CheckoutRequest {
  branch: string;
  create?: boolean;
}

export interface CommitRequest {
  message: string;
  files?: string[];
}

// ============================================================================
// Search Requests (Query Params)
// ============================================================================

export interface SearchQueryParams {
  q: string;
  types?: string; // Comma-separated: feature,entity,endpoint,component
  limit?: number;
}

export interface ConversationSearchRequest {
  query: string;
  filters?: {
    phase?: 'cpo' | 'clarify' | 'cto';
    featureId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}
