/**
 * Zod validation schemas for domain types
 */

import { z } from 'zod';

// ============================================================================
// Project Schemas
// ============================================================================

export const ProjectModeSchema = z.enum(['new', 'reverse_engineered']);

export const ProjectPhaseSchema = z.enum(['cpo', 'clarify', 'cto', 'complete']);

export const ProjectSettingsSchema = z.object({
  defaultBranch: z.string(),
  autoSave: z.boolean(),
  autoCommit: z.boolean(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  path: z.string(),
  mode: ProjectModeSchema,
  phase: ProjectPhaseSchema,
  version: z.string(),
  settings: ProjectSettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// Module Schemas
// ============================================================================

export const ModuleSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string(),
  order: z.number().int().min(0),
  features: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// Feature Schemas
// ============================================================================

export const FeatureStatusSchema = z.enum(['draft', 'in_progress', 'completed']);

export const FeaturePhaseSchema = z.enum(['cpo', 'clarify', 'cto', 'complete']);

export const FeatureSourceSchema = z.enum(['new', 'reverse_engineered']);

export const FeaturePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const ComplexitySchema = z.enum(['low', 'medium', 'high']);

export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const ImplementationFileSchema = z.object({
  path: z.string(),
  description: z.string(),
});

export const BusinessRequirementsSchema = z.object({
  userStory: z.string(),
  acceptanceCriteria: z.array(z.string()),
  priority: FeaturePrioritySchema,
});

export const SchemaReferenceSchema = z.object({
  entity: z.string(),
  usage: z.string(),
});

export const APIReferenceSchema = z.object({
  type: z.enum(['rest', 'graphql']),
  method: z.string().optional(),
  path: z.string().optional(),
  operation: z.string().optional(),
});

export const ComponentReferenceSchema = z.object({
  id: z.string(),
  type: z.enum(['page', 'component']),
});

export const TechnicalRequirementsSchema = z.object({
  schemaRefs: z.array(SchemaReferenceSchema),
  apiRefs: z.array(APIReferenceSchema),
  componentRefs: z.array(ComponentReferenceSchema),
});

export const ImplementationStepSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  title: z.string(),
  description: z.string(),
  complexity: ComplexitySchema,
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: TaskStatusSchema,
  complexity: ComplexitySchema,
  dependsOn: z.array(z.string()),
  implementationStepId: z.string(),
  completedAt: z.string().datetime().optional(),
});

export const TaskProgressSchema = z.object({
  total: z.number().int().min(0),
  completed: z.number().int().min(0),
  inProgress: z.number().int().min(0),
  pending: z.number().int().min(0),
  percentComplete: z.number().min(0).max(100),
});

export const ChecklistItemSchema = z.object({
  id: z.string(),
  criterion: z.string(),
  source: z.string(),
  verified: z.boolean(),
  verifiedAt: z.string().datetime().optional(),
  verifiedBy: z.enum(['user', 'ai']).optional(),
  notes: z.string().optional(),
});

export const ChecklistProgressSchema = z.object({
  total: z.number().int().min(0),
  verified: z.number().int().min(0),
  percentComplete: z.number().min(0).max(100),
});

export const FeatureSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  name: z.string(),
  description: z.string(),
  status: FeatureStatusSchema,
  phase: FeaturePhaseSchema,
  implemented: z.boolean(),
  source: FeatureSourceSchema,
  implementationFiles: z.array(ImplementationFileSchema),
  dependencies: z.array(z.string()),
  business: BusinessRequirementsSchema.optional(),
  technical: TechnicalRequirementsSchema.optional(),
  implementationPlan: z.array(ImplementationStepSchema),
  tasks: z.array(TaskSchema),
  taskProgress: TaskProgressSchema,
  checklist: z.array(ChecklistItemSchema),
  checklistProgress: ChecklistProgressSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// Artifact Schemas
// ============================================================================

export const FieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  constraints: z.array(z.string()),
  default: z.string().optional(),
  note: z.string().optional(),
});

export const IndexSchema = z.object({
  fields: z.array(z.string()),
  unique: z.boolean().optional(),
  name: z.string().optional(),
});

export const EntitySchema = z.object({
  name: z.string(),
  fields: z.array(FieldSchema),
  indexes: z.array(IndexSchema),
  featureRefs: z.array(z.string()),
});

export const RelationshipSchema = z.object({
  fromTable: z.string(),
  fromField: z.string(),
  toTable: z.string(),
  toField: z.string(),
  type: z.enum(['one_to_one', 'one_to_many', 'many_to_many']),
});

export const SchemaArtifactSchema = z.object({
  dbml: z.string(),
  entities: z.array(EntitySchema),
  relationships: z.array(RelationshipSchema),
  lastUpdated: z.string().datetime(),
});

export const EndpointSchema = z.object({
  id: z.string(),
  type: z.enum(['rest', 'graphql']),
  method: z.string().optional(),
  path: z.string().optional(),
  operation: z.string().optional(),
  description: z.string(),
  featureRefs: z.array(z.string()),
});

export const OpenAPIArtifactSchema = z.object({
  spec: z.record(z.any()),
  endpoints: z.array(EndpointSchema),
  lastUpdated: z.string().datetime(),
});

export const GraphQLArgumentSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  defaultValue: z.any().optional(),
});

export const GraphQLFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  args: z.array(GraphQLArgumentSchema).optional(),
  description: z.string().optional(),
});

export const GraphQLTypeSchema = z.object({
  name: z.string(),
  kind: z.enum(['object', 'input', 'enum', 'scalar', 'interface', 'union']),
  fields: z.array(GraphQLFieldSchema).optional(),
  values: z.array(z.string()).optional(),
});

export const GraphQLOperationSchema = z.object({
  name: z.string(),
  type: z.enum(['query', 'mutation', 'subscription']),
  description: z.string().optional(),
  featureRef: z.string().optional(),
});

export const GraphQLArtifactSchema = z.object({
  schema: z.string(),
  types: z.array(GraphQLTypeSchema),
  operations: z.array(GraphQLOperationSchema),
  lastUpdated: z.string().datetime(),
});

export const UIComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['page', 'component']),
  html: z.string(),
  description: z.string(),
  featureRefs: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// Constitution Schemas
// ============================================================================

export const NamingConventionsSchema = z.object({
  functions: z.string(),
  classes: z.string(),
  database_tables: z.string(),
  database_columns: z.string(),
});

export const StyleRulesSchema = z.object({
  max_function_length: z.number().int().min(1),
  require_docstrings: z.boolean(),
  prefer_composition: z.boolean(),
}).catchall(z.any());

export const SecurityRequirementsSchema = z.object({
  authentication: z.string(),
  authorization: z.string(),
  input_validation: z.string(),
  secrets: z.string(),
  password_hashing: z.string().optional(),
}).catchall(z.any());

export const UXPatternsSchema = z.object({
  error_format: z.string(),
  loading_states: z.string(),
  accessibility: z.string(),
  responsive: z.string().optional(),
}).catchall(z.any());

export const TechConstraintsSchema = z.object({
  allowed_libraries: z.array(z.string()),
  forbidden_libraries: z.array(z.string()),
  node_version: z.string(),
  typescript: z.string().optional(),
}).catchall(z.any());

export const CodingStandardsSchema = z.object({
  naming: NamingConventionsSchema,
  style: StyleRulesSchema,
});

export const HookActionTypeSchema = z.enum([
  'validateSchema',
  'updateChecklist',
  'regenerateAPIs',
  'runAnalyzer',
  'updateProgress',
  'notifyUser',
]);

export const HookActionSchema = z.object({
  action: HookActionTypeSchema,
  options: z.record(z.any()).optional(),
});

export const AgentHooksSchema = z.object({
  onFeatureSave: z.array(HookActionSchema).optional(),
  onSchemaChange: z.array(HookActionSchema).optional(),
  preCommit: z.array(HookActionSchema).optional(),
}).catchall(z.array(HookActionSchema));

export const ConstitutionSchema = z.object({
  version: z.string(),
  principles: z.array(z.string()),
  coding: CodingStandardsSchema,
  security: SecurityRequirementsSchema,
  ux: UXPatternsSchema,
  constraints: TechConstraintsSchema,
  hooks: AgentHooksSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
