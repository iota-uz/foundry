/**
 * Zod validation schemas for workflow types
 */

import { z } from 'zod';

// ============================================================================
// Workflow Schemas
// ============================================================================

export const WorkflowIdSchema = z.enum([
  'cpo-phase',
  'clarify-phase',
  'cto-phase',
  're-workflow',
  'actualize-workflow',
]);

export const GeneratorTypeSchema = z.enum(['schema', 'api', 'component']);

export const TopicDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  order: z.number().int().min(0),
  estimatedQuestions: z.number().int().min(0),
  phase: z.enum(['cpo', 'cto']),
  triggerGenerator: GeneratorTypeSchema.optional(),
});

export const RetryPolicySchema = z.object({
  maxRetries: z.number().int().min(0),
  backoffMs: z.number().int().min(0),
  maxBackoffMs: z.number().int().min(0),
});

// ============================================================================
// Step Schemas
// ============================================================================

export const StepTypeSchema = z.enum([
  'code',
  'llm',
  'question',
  'conditional',
  'loop',
  'nested_workflow',
]);

export const ClaudeModelSchema = z.enum(['haiku', 'sonnet', 'opus']);

export const QuestionTypeSchema = z.enum([
  'single_choice',
  'multiple_choice',
  'text',
  'number',
  'date',
  'color',
  'code',
  'icon_picker',
  'component_variant',
  'comparison_table',
  'layout_template',
  'dependency_mapping',
  'priority_ranking',
  'component_structure',
]);

// ============================================================================
// Q&A Feature Schemas (F14-F20)
// ============================================================================

/**
 * Impact preview for options (F18)
 */
export const ImpactPreviewSchema = z.object({
  summary: z.string(),
  specChanges: z.object({
    sections: z.array(z.string()),
    estimatedFields: z.number().int().min(0),
  }),
  additionalQuestions: z.object({
    estimate: z.number().int().min(0),
    topics: z.array(z.string()),
  }),
  dependencies: z.object({
    creates: z.array(z.string()),
    removes: z.array(z.string()),
  }),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  reversibility: z.enum(['easy', 'moderate', 'significant']),
});

/**
 * Question explainer (F19)
 */
export const QuestionExplainerSchema = z.object({
  connection: z.string(),
  purpose: z.string(),
  downstream: z.object({
    schemaImpact: z.array(z.string()),
    apiImpact: z.array(z.string()),
    componentImpact: z.array(z.string()),
  }),
  example: z
    .object({
      ifYouChoose: z.string(),
      thenSpecWillHave: z.string(),
    })
    .optional(),
  relatedAnswer: z
    .object({
      questionId: z.string(),
      summary: z.string(),
    })
    .optional(),
});

/**
 * AI recommendation (F16)
 */
export const RecommendationSourceSchema = z.enum([
  'constitution',
  'best_practice',
  'context_inference',
  'majority_usage',
]);

export const AIRecommendationSchema = z.object({
  recommendedOptionId: z.string(),
  confidence: z.enum(['high', 'medium']),
  reasoning: z.string().max(200),
  source: RecommendationSourceSchema,
  caveats: z.array(z.string()).optional(),
});

export const QuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  impactPreview: ImpactPreviewSchema.optional(),
});

export const ValidationRuleSchema = z.object({
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  pattern: z.string().optional(),
  message: z.string(),
});

export const AIQuestionSchema = z.object({
  id: z.string(),
  questionType: QuestionTypeSchema,
  question: z.string(),
  description: z.string().optional(),
  options: z.array(QuestionOptionSchema).optional(),
  validation: ValidationRuleSchema.optional(),
  required: z.boolean(),
  defaultValue: z.any().optional(),
  context: z.string().optional(),
  explainer: QuestionExplainerSchema.optional(),
  recommendation: AIRecommendationSchema.optional(),
});

/**
 * Answer to a question
 */
export const AnswerSchema = z.object({
  questionId: z.string(),
  value: z.any(),
  answeredAt: z.string().datetime(),
  skipped: z.boolean(),
});

/**
 * Question batch (F14)
 */
export const QuestionBatchSchema = z.object({
  batchId: z.string(),
  topic: z.string(),
  topicDescription: z.string(),
  questions: z.array(AIQuestionSchema),
  estimatedTimeMinutes: z.number().int().min(0),
  batchPosition: z.object({
    current: z.number().int().min(1),
    total: z.number().int().min(1),
    phase: z.enum(['cpo', 'clarify', 'cto']),
  }),
});

// ============================================================================
// Step Schemas
// ============================================================================

export const BaseStepDefinitionSchema = z.object({
  id: z.string(),
  type: StepTypeSchema,
  description: z.string(),
  timeout: z.number().int().min(0).optional(),
  retryable: z.boolean().optional(),
});

export const CodeStepSchema = BaseStepDefinitionSchema.extend({
  type: z.literal('code'),
  handler: z.string(),
  input: z.record(z.any()).optional(),
});

export const LLMStepSchema = BaseStepDefinitionSchema.extend({
  type: z.literal('llm'),
  model: ClaudeModelSchema,
  systemPromptFile: z.string(),
  userPromptFile: z.string(),
  outputSchema: z.string().optional(),
  maxTokens: z.number().int().min(1).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

export const QuestionStepSchema = BaseStepDefinitionSchema.extend({
  type: z.literal('question'),
  questionSource: z.enum(['static', 'generated']),
  questionData: AIQuestionSchema.optional(),
  generatorPromptFile: z.string().optional(),
  topicId: z.string().optional(),
});

// Forward declare for recursive types
export const StepDefinitionSchema: z.ZodType<StepDefinition> = z.lazy(() =>
  z.union([
    CodeStepSchema,
    LLMStepSchema,
    QuestionStepSchema,
    ConditionalStepSchema,
    LoopStepSchema,
    NestedWorkflowStepSchema,
  ])
);

export const ConditionalStepSchema = BaseStepDefinitionSchema.extend({
  type: z.literal('conditional'),
  condition: z.string(),
  thenSteps: z.array(StepDefinitionSchema),
  elseSteps: z.array(StepDefinitionSchema).optional(),
});

export const LoopStepSchema = BaseStepDefinitionSchema.extend({
  type: z.literal('loop'),
  collection: z.string(),
  itemVariable: z.string(),
  steps: z.array(StepDefinitionSchema),
  maxIterations: z.number().int().min(1).optional(),
});

export const NestedWorkflowStepSchema = BaseStepDefinitionSchema.extend({
  type: z.literal('nested_workflow'),
  workflowId: z.string(),
  input: z.record(z.any()).optional(),
});

export const WorkflowDefinitionSchema = z.object({
  id: WorkflowIdSchema,
  name: z.string(),
  description: z.string(),
  steps: z.array(StepDefinitionSchema),
  topics: z.array(TopicDefinitionSchema).optional(),
  timeout: z.number().int().min(0).optional(),
  retryPolicy: RetryPolicySchema.optional(),
});

export const StepResultSchema = z.object({
  stepId: z.string(),
  status: z.enum(['completed', 'failed', 'skipped']),
  output: z.record(z.any()).optional(),
  error: z.string().optional(),
  duration: z.number().int().min(0),
  tokensUsed: z.number().int().min(0).optional(),
});

export const StepExecutionSchema = z.object({
  id: z.string(),
  checkpointId: z.string(),
  stepId: z.string(),
  stepType: StepTypeSchema,
  status: z.enum(['completed', 'failed', 'skipped']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  inputData: z.record(z.any()).optional(),
  outputData: z.record(z.any()).optional(),
  error: z.string().optional(),
  llmTokensUsed: z.number().int().min(0).optional(),
  durationMs: z.number().int().min(0),
});

// ============================================================================
// State Schemas
// ============================================================================

export const WorkflowStatusSchema = z.enum([
  'running',
  'paused',
  'waiting_user',
  'completed',
  'failed',
]);

export const AmbiguityTypeSchema = z.enum([
  'vague_language',
  'missing_edge_case',
  'ambiguous_flow',
  'conflict',
]);

export const AmbiguitySeveritySchema = z.enum(['high', 'medium', 'low']);

export const AmbiguityStatusSchema = z.enum(['pending', 'resolved', 'deferred']);

export const AmbiguitySchema = z.object({
  id: z.string(),
  featureId: z.string(),
  type: AmbiguityTypeSchema,
  severity: AmbiguitySeveritySchema,
  text: z.string(),
  context: z.string(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  resolution: z.string().optional(),
  status: AmbiguityStatusSchema,
});

export const ClarifyStatusSchema = z.enum([
  'scanning',
  'categorizing',
  'resolving',
  'complete',
]);

export const ClarifyStateSchema = z.object({
  ambiguities: z.array(AmbiguitySchema),
  currentIndex: z.number().int().min(0),
  resolvedCount: z.number().int().min(0),
  deferredCount: z.number().int().min(0),
  status: ClarifyStatusSchema,
});

export const EditRecordSchema = z.object({
  questionId: z.string(),
  previousAnswer: z.any(),
  newAnswer: z.any(),
  editedAt: z.string().datetime(),
  affectedSteps: z.array(z.string()),
});

/**
 * Decision journal entry (F17)
 */
export const AffectedArtifactSchema = z.object({
  type: z.enum(['schema', 'api', 'component', 'feature']),
  id: z.string(),
  changes: z.array(z.string()),
  fieldCount: z.number().int().min(0),
});

export const DecisionEntrySchema = z.object({
  id: z.string(),
  questionId: z.string(),
  questionText: z.string(),
  answerGiven: z.any(),
  alternatives: z.array(z.any()),
  category: z.enum([
    'product_scope',
    'user_experience',
    'data_model',
    'api_design',
    'technology',
    'security',
    'performance',
    'integration',
  ]),
  phase: z.enum(['cpo', 'clarify', 'cto']),
  batchId: z.string().optional(),
  artifactsAffected: z.array(AffectedArtifactSchema),
  cascadeGroup: z.string().optional(),
  reversibility: z.enum(['easy', 'moderate', 'significant']),
  aiRecommendation: z
    .object({
      optionId: z.string(),
      confidence: z.enum(['high', 'medium']),
      reasoning: z.string(),
    })
    .optional(),
  recommendationFollowed: z.boolean().optional(),
  createdAt: z.string().datetime(),
  canUndo: z.boolean(),
  undoneAt: z.string().datetime().optional(),
});

export const WorkflowStateSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  workflowId: WorkflowIdSchema,
  currentStepId: z.string(),
  status: WorkflowStatusSchema,
  currentTopicIndex: z.number().int().min(0),
  currentQuestionIndex: z.number().int().min(0),
  topicQuestionCounts: z.record(z.number().int().min(0)),
  answers: z.record(z.any()),
  skippedQuestions: z.array(z.string()),
  data: z.record(z.any()),
  clarifyState: ClarifyStateSchema.nullable(),
  stepHistory: z.array(StepExecutionSchema),
  editHistory: z.array(DecisionEntrySchema).optional(),
  checkpoint: z.string(),
  startedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  pausedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
  retryCount: z.number().int().min(0),
});

export const WorkflowContextSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  workflowId: WorkflowIdSchema,
  state: WorkflowStateSchema,
  constitution: z.any().nullable(),
});

export const WorkflowResultSchema = z.object({
  sessionId: z.string(),
  workflowId: WorkflowIdSchema,
  status: z.enum(['completed', 'failed', 'cancelled']),
  data: z.record(z.any()),
  error: z.string().optional(),
  duration: z.number().int().min(0),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
});
