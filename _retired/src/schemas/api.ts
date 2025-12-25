/**
 * Zod validation schemas for API types
 */

import { z } from 'zod';
import {
  ProjectModeSchema,
  FeatureStatusSchema,
  FeaturePrioritySchema,
  TaskStatusSchema,
} from './domain';
import { WorkflowIdSchema } from './workflow';

// ============================================================================
// Project Request Schemas
// ============================================================================

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  path: z.string(),
  mode: ProjectModeSchema,
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  settings: z.object({
    defaultBranch: z.string().optional(),
    autoSave: z.boolean().optional(),
    autoCommit: z.boolean().optional(),
  }).optional(),
});

// ============================================================================
// Module Request Schemas
// ============================================================================

export const CreateModuleRequestSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  description: z.string(),
  order: z.number().int().min(0).optional(),
});

export const UpdateModuleRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

// ============================================================================
// Feature Request Schemas
// ============================================================================

export const CreateFeatureRequestSchema = z.object({
  moduleId: z.string(),
  name: z.string().min(1),
  description: z.string(),
  source: z.enum(['new', 'reverse_engineered']).optional(),
});

export const UpdateFeatureRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: FeatureStatusSchema.optional(),
  business: z.object({
    userStory: z.string().optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    priority: FeaturePrioritySchema.optional(),
  }).optional(),
});

export const AddFeatureDependencyRequestSchema = z.object({
  dependsOnFeatureId: z.string(),
});

// ============================================================================
// Task Request Schemas
// ============================================================================

export const UpdateTaskRequestSchema = z.object({
  status: TaskStatusSchema,
  notes: z.string().optional(),
});

// ============================================================================
// Checklist Request Schemas
// ============================================================================

export const UpdateChecklistRequestSchema = z.object({
  verified: z.boolean(),
  notes: z.string().optional(),
});

// ============================================================================
// Component Request Schemas
// ============================================================================

export const CreateComponentRequestSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['page', 'component']),
  html: z.string(),
  description: z.string(),
});

export const UpdateComponentRequestSchema = z.object({
  name: z.string().min(1).optional(),
  html: z.string().optional(),
  description: z.string().optional(),
});

// ============================================================================
// Constitution Request Schemas
// ============================================================================

export const UpdateConstitutionRequestSchema = z.object({
  principles: z.array(z.string()).optional(),
  coding: z.object({
    naming: z.record(z.string()).optional(),
    style: z.record(z.any()).optional(),
  }).optional(),
  security: z.record(z.any()).optional(),
  ux: z.record(z.any()).optional(),
  constraints: z.object({
    allowed_libraries: z.array(z.string()).optional(),
    forbidden_libraries: z.array(z.string()).optional(),
    node_version: z.string().optional(),
    typescript: z.string().optional(),
  }).optional(),
  hooks: z.record(z.array(z.any())).optional(),
});

// ============================================================================
// Workflow Request Schemas
// ============================================================================

export const StartWorkflowRequestSchema = z.object({
  projectId: z.string(),
  workflowId: WorkflowIdSchema,
  mode: z.enum(['new', 'reverse']).optional(),
  initialPrompt: z.string().optional(),
  targetPath: z.string().optional(),
});

export const AnswerRequestSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  answer: z.union([z.string(), z.array(z.string())]),
});

export const SkipRequestSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
});

export const RetryStepRequestSchema = z.object({
  sessionId: z.string(),
  stepId: z.string(),
});

export const ClarifyResolveRequestSchema = z.object({
  sessionId: z.string(),
  ambiguityId: z.string(),
  resolution: z.string(),
});

export const ClarifyDeferRequestSchema = z.object({
  sessionId: z.string(),
  ambiguityId: z.string(),
});

// ============================================================================
// Analyzer Request Schemas
// ============================================================================

export const AnalysisCheckSchema = z.enum([
  'schema_consistency',
  'api_coverage',
  'missing_refs',
  'orphan_artifacts',
  'duplicate_definitions',
  'naming_conventions',
  'constitution_compliance',
]);

export const AnalyzeRequestSchema = z.object({
  scope: z.enum(['project', 'module', 'feature']),
  targetId: z.string().optional(),
  checks: z.array(AnalysisCheckSchema).optional(),
});

// ============================================================================
// Actualize Request Schemas
// ============================================================================

export const ActualizeRequestSchema = z.object({
  scope: z.enum(['project', 'module', 'feature']),
  targetId: z.string().optional(),
  options: z.object({
    includeNewFeatures: z.boolean().optional(),
    includeRemovedFeatures: z.boolean().optional(),
    includeSchemaChanges: z.boolean().optional(),
    includeApiChanges: z.boolean().optional(),
    autoMarkImplemented: z.boolean().optional(),
  }).optional(),
});

// ============================================================================
// Annotation Request Schemas
// ============================================================================

export const CreateAnnotationRequestSchema = z.object({
  artifactType: z.enum(['feature', 'entity', 'endpoint', 'component']),
  artifactId: z.string(),
  fieldPath: z.string(),
  content: z.string(),
});

export const UpdateAnnotationRequestSchema = z.object({
  content: z.string().optional(),
  status: z.enum(['open', 'resolved']).optional(),
});

// ============================================================================
// Lesson Request Schemas
// ============================================================================

export const CreateLessonRequestSchema = z.object({
  type: z.enum(['correction', 'pattern', 'constraint']),
  context: z.string(),
  problem: z.string(),
  solution: z.string(),
});

// ============================================================================
// Git Request Schemas
// ============================================================================

export const CheckoutRequestSchema = z.object({
  branch: z.string(),
  create: z.boolean().optional(),
});

export const CommitRequestSchema = z.object({
  message: z.string().min(1),
  files: z.array(z.string()).optional(),
});

// ============================================================================
// Search Request Schemas
// ============================================================================

export const SearchQueryParamsSchema = z.object({
  q: z.string().min(1),
  types: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const ConversationSearchRequestSchema = z.object({
  query: z.string().min(1),
  filters: z.object({
    phase: z.enum(['cpo', 'clarify', 'cto']).optional(),
    featureId: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }).optional(),
});

// ============================================================================
// Error Schemas
// ============================================================================

export const ErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'GIT_CONFLICT',
  'GIT_ERROR',
  'LLM_ERROR',
  'LLM_TIMEOUT',
  'FILE_ERROR',
  'FILE_NOT_FOUND',
  'FILE_PERMISSION_ERROR',
  'WORKFLOW_ERROR',
  'STEP_ERROR',
  'CHECKPOINT_ERROR',
  'TIMEOUT_ERROR',
  'CONSTITUTION_ERROR',
  'ANALYSIS_ERROR',
  'CLARIFY_ERROR',
  'GENERATOR_ERROR',
  'HOOK_ERROR',
  'DUPLICATE_ID',
  'CIRCULAR_DEPENDENCY',
  'INVALID_STATE',
]);

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
});

export const ValidationErrorDetailsSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.any().optional(),
});
