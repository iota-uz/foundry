/**
 * @sys/graph - Validation Layer
 *
 * Zod schemas for runtime validation of workflow configurations.
 * These schemas provide a second layer of defense after TypeScript's
 * compile-time checks, catching issues that slip through at runtime.
 *
 * Three-layer validation strategy:
 * 1. Compile-time: TypeScript generics (catches most errors)
 * 2. Load-time: Zod schemas (catches malformed configs)
 * 3. Runtime: Dynamic transition validation (catches invalid returns)
 */

import { z } from 'zod';
import { NodeType, StdlibTool, AgentModel, WorkflowStatus, END_NODE } from './enums';

// ============================================================================
// Enum Schemas
// ============================================================================

/**
 * Schema for NodeType enum values.
 */
export const NodeTypeSchema = z.nativeEnum(NodeType);

/**
 * Schema for StdlibTool enum values.
 */
export const StdlibToolSchema = z.nativeEnum(StdlibTool);

/**
 * Schema for AgentModel enum values.
 */
export const AgentModelSchema = z.nativeEnum(AgentModel);

/**
 * Schema for WorkflowStatus enum values.
 */
export const WorkflowStatusSchema = z.nativeEnum(WorkflowStatus);

// ============================================================================
// Tool Schemas
// ============================================================================

/**
 * Schema for inline tool definitions.
 * Note: We use z.any() for the schema field since Zod schemas can't validate other Zod schemas.
 */
export const InlineToolSchema = z.object({
  name: z.string().min(1, 'Tool name cannot be empty'),
  description: z.string().min(1, 'Tool description cannot be empty'),
  schema: z.any(), // Zod schema - validated at runtime by type system
  execute: z.function(),
});

/**
 * Schema for tool references (stdlib enum or inline definition).
 */
export const ToolReferenceSchema = z.union([
  StdlibToolSchema,
  InlineToolSchema,
]);

/**
 * Schema for array of tool references.
 */
export const ToolArraySchema = z.array(ToolReferenceSchema);

// ============================================================================
// Transition Schemas
// ============================================================================

/**
 * Creates a schema for static transitions given valid node names.
 */
export function createStaticTransitionSchema(validNames: readonly string[]) {
  // Ensure at least one element for the enum (END_NODE is always valid)
  const allValidTargets: [string, ...string[]] = [END_NODE, ...validNames];
  return z.enum(allValidTargets);
}

/**
 * Schema for transition functions.
 */
export const DynamicTransitionSchema = z.function()
  .args(z.any()) // WorkflowState
  .returns(z.string());

/**
 * Creates a schema for transitions (static or dynamic) given valid node names.
 */
export function createTransitionSchema(validNames: readonly string[]) {
  return z.union([
    createStaticTransitionSchema(validNames),
    DynamicTransitionSchema,
  ]);
}

// ============================================================================
// Base Node Schema
// ============================================================================

/**
 * Creates the base node schema with common fields.
 */
export function createBaseNodeSchema(validNames: readonly string[]) {
  return z.object({
    type: NodeTypeSchema,
    name: z.string().min(1, 'Node name cannot be empty'),
    then: createTransitionSchema(validNames),
  });
}

// ============================================================================
// Specific Node Schemas
// ============================================================================

/**
 * Creates schema for Agent nodes.
 */
export function createAgentNodeSchema(validNames: readonly string[]) {
  return z.object({
    type: z.literal(NodeType.Agent),
    name: z.string().min(1),
    role: z.string().min(1, 'Agent role cannot be empty'),
    prompt: z.string().min(1, 'Agent prompt cannot be empty'),
    capabilities: ToolArraySchema.optional(),
    model: AgentModelSchema.optional(),
    maxTurns: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(1).optional(),
    then: createTransitionSchema(validNames),
  });
}

/**
 * Creates schema for Command nodes.
 */
export function createCommandNodeSchema(validNames: readonly string[]) {
  return z.object({
    type: z.literal(NodeType.Command),
    name: z.string().min(1),
    command: z.string().min(1, 'Command cannot be empty'),
    cwd: z.string().optional(),
    env: z.record(z.string()).optional(),
    timeout: z.number().int().positive().optional(),
    throwOnError: z.boolean().optional(),
    then: createTransitionSchema(validNames),
  });
}

/**
 * Creates schema for SlashCommand nodes.
 */
export function createSlashCommandNodeSchema(validNames: readonly string[]) {
  return z.object({
    type: z.literal(NodeType.SlashCommand),
    name: z.string().min(1),
    command: z.string().min(1, 'Slash command name cannot be empty'),
    args: z.string(), // Can be empty
    then: createTransitionSchema(validNames),
  });
}

/**
 * Creates schema for Eval nodes.
 */
export function createEvalNodeSchema(validNames: readonly string[]) {
  return z.object({
    type: z.literal(NodeType.Eval),
    name: z.string().min(1),
    update: z.function().args(z.any()).returns(z.record(z.unknown())),
    then: createTransitionSchema(validNames),
  });
}

/**
 * Dynamic value schema (static value or function).
 */
function dynamicSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.union([
    valueSchema,
    z.function().args(z.any()).returns(valueSchema),
  ]);
}

/**
 * Creates schema for DynamicAgent nodes.
 */
export function createDynamicAgentNodeSchema(validNames: readonly string[]) {
  return z.object({
    type: z.literal(NodeType.DynamicAgent),
    name: z.string().min(1),
    model: dynamicSchema(AgentModelSchema),
    prompt: dynamicSchema(z.string()),
    system: dynamicSchema(z.string()).optional(),
    capabilities: dynamicSchema(ToolArraySchema).optional(),
    maxTurns: dynamicSchema(z.number().int().positive()).optional(),
    temperature: dynamicSchema(z.number().min(0).max(1)).optional(),
    then: createTransitionSchema(validNames),
  });
}

/**
 * Creates schema for DynamicCommand nodes.
 */
export function createDynamicCommandNodeSchema(validNames: readonly string[]) {
  return z.object({
    type: z.literal(NodeType.DynamicCommand),
    name: z.string().min(1),
    command: dynamicSchema(z.string()),
    cwd: dynamicSchema(z.string()).optional(),
    env: dynamicSchema(z.record(z.string())).optional(),
    timeout: dynamicSchema(z.number().int().positive()).optional(),
    then: createTransitionSchema(validNames),
  });
}

// ============================================================================
// Unified Node Schema
// ============================================================================

/**
 * Creates a discriminated union schema for all node types.
 */
export function createNodeSchema(validNames: readonly string[]) {
  return z.discriminatedUnion('type', [
    createAgentNodeSchema(validNames),
    createCommandNodeSchema(validNames),
    createSlashCommandNodeSchema(validNames),
    createEvalNodeSchema(validNames),
    createDynamicAgentNodeSchema(validNames),
    createDynamicCommandNodeSchema(validNames),
  ]);
}

// ============================================================================
// Workflow Schema
// ============================================================================

/**
 * Creates the complete workflow configuration schema.
 */
export function createWorkflowSchema(validNames: readonly string[]) {
  const nodeSchema = createNodeSchema(validNames);

  return z.object({
    id: z.string().min(1, 'Workflow ID cannot be empty'),
    schema: z.object({
      names: z.array(z.string()).min(1, 'Schema must have at least one node name'),
    }),
    nodes: z.array(nodeSchema).min(1, 'Workflow must have at least one node'),
    initialContext: z.record(z.unknown()).optional(),
  });
}

// ============================================================================
// Workflow State Schema
// ============================================================================

/**
 * Schema for workflow state.
 */
export const WorkflowStateSchema = z.object({
  currentNode: z.string(),
  status: WorkflowStatusSchema,
  updatedAt: z.string().datetime(),
  conversationHistory: z.array(z.unknown()),
  context: z.record(z.unknown()),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result type.
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}

/**
 * Structured validation error.
 */
export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

/**
 * Converts Zod errors to our ValidationError format.
 */
function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map((e) => ({
    path: e.path.map(String),
    message: e.message,
    code: e.code,
  }));
}

/**
 * Validates a workflow configuration at load time.
 *
 * @param config - The raw workflow configuration
 * @param validNames - Array of valid node names from schema
 * @returns Validation result with errors if any
 */
export function validateWorkflow(
  config: unknown,
  validNames: readonly string[]
): ValidationResult {
  const schema = createWorkflowSchema(validNames);
  const result = schema.safeParse(config);

  if (result.success) {
    return { success: true, errors: [] };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

/**
 * Validates a single node definition.
 *
 * @param node - The node definition to validate
 * @param validNames - Array of valid node names
 * @returns Validation result with errors if any
 */
export function validateNode(
  node: unknown,
  validNames: readonly string[]
): ValidationResult {
  const schema = createNodeSchema(validNames);
  const result = schema.safeParse(node);

  if (result.success) {
    return { success: true, errors: [] };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

/**
 * Validates a runtime transition result.
 *
 * @param transition - The transition result (from dynamic function)
 * @param validNames - Array of valid node names
 * @param currentNode - Current node name (for error messages)
 * @throws Error if transition is invalid
 */
export function validateRuntimeTransition(
  transition: unknown,
  validNames: readonly string[],
  currentNode: string
): asserts transition is string {
  if (typeof transition !== 'string') {
    throw new Error(
      `Node "${currentNode}" transition returned ${typeof transition}, expected string`
    );
  }

  const validTargets = new Set([...validNames, END_NODE]);
  if (!validTargets.has(transition)) {
    throw new Error(
      `Node "${currentNode}" transition returned invalid target "${transition}". ` +
      `Valid targets: ${[...validTargets].join(', ')}`
    );
  }
}

/**
 * Validates workflow state.
 *
 * @param state - The state to validate
 * @returns Validation result with errors if any
 */
export function validateState(state: unknown): ValidationResult {
  const result = WorkflowStateSchema.safeParse(state);

  if (result.success) {
    return { success: true, errors: [] };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

// ============================================================================
// Semantic Validation
// ============================================================================

/**
 * Performs semantic validation beyond schema structure.
 * Checks for logical errors that Zod can't catch.
 *
 * @param config - The workflow configuration
 * @returns Array of semantic validation errors
 */
export function validateSemantics<TNodeNames extends string>(
  config: {
    id: string;
    schema: { names: readonly TNodeNames[] };
    nodes: Array<{ name: string; then: unknown }>;
  }
): ValidationError[] {
  const errors: ValidationError[] = [];
  const schemaNames = new Set(config.schema.names);
  const definedNames = new Set<string>();

  // Check each node
  for (let i = 0; i < config.nodes.length; i++) {
    const node = config.nodes[i];
    if (!node) continue; // Skip if undefined (shouldn't happen)

    const path = ['nodes', String(i)];

    // Check for duplicate definitions
    if (definedNames.has(node.name)) {
      errors.push({
        path: [...path, 'name'],
        message: `Duplicate node definition: "${node.name}"`,
        code: 'duplicate_node',
      });
    }
    definedNames.add(node.name);

    // Check node name is in schema
    if (!schemaNames.has(node.name as TNodeNames)) {
      errors.push({
        path: [...path, 'name'],
        message: `Node "${node.name}" is not defined in schema`,
        code: 'unknown_node',
      });
    }
  }

  // Check all schema names have definitions
  for (const name of config.schema.names) {
    if (!definedNames.has(name)) {
      errors.push({
        path: ['nodes'],
        message: `Schema node "${name}" has no definition`,
        code: 'missing_node',
      });
    }
  }

  // Check for unreachable nodes (nodes that can't be reached from entry)
  const reachable = new Set<string>();
  const toVisit = [config.nodes[0]?.name].filter(Boolean);

  while (toVisit.length > 0) {
    const current = toVisit.pop()!;
    if (reachable.has(current) || current === END_NODE) continue;
    reachable.add(current);

    const node = config.nodes.find((n) => n.name === current);
    if (!node) continue;

    // For static transitions, add the target
    if (typeof node.then === 'string') {
      toVisit.push(node.then);
    }
    // For dynamic transitions, we can't statically determine targets
    // so we assume all nodes could potentially be reached
    else if (typeof node.then === 'function') {
      // Mark all nodes as potentially reachable from dynamic transitions
      for (const n of config.nodes) {
        toVisit.push(n.name);
      }
    }
  }

  // Report unreachable nodes (only if no dynamic transitions)
  const hasDynamicTransitions = config.nodes.some(
    (n) => n && typeof n.then === 'function'
  );
  if (!hasDynamicTransitions) {
    for (const node of config.nodes) {
      if (node && !reachable.has(node.name)) {
        errors.push({
          path: ['nodes'],
          message: `Node "${node.name}" is unreachable from entry node`,
          code: 'unreachable_node',
        });
      }
    }
  }

  return errors;
}

/**
 * Complete validation: schema + semantics.
 */
export function validateComplete(
  config: unknown,
  validNames: readonly string[]
): ValidationResult {
  // First, validate structure
  const structureResult = validateWorkflow(config, validNames);
  if (!structureResult.success) {
    return structureResult;
  }

  // Then, validate semantics
  const semanticErrors = validateSemantics(
    config as {
      id: string;
      schema: { names: readonly string[] };
      nodes: Array<{ name: string; then: unknown }>;
    }
  );

  if (semanticErrors.length > 0) {
    return { success: false, errors: semanticErrors };
  }

  return { success: true, errors: [] };
}
