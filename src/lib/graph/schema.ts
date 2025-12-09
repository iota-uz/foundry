/**
 * @sys/graph - Node Schema System
 *
 * Provides compile-time type safety for workflow definitions.
 * The schema system ensures that all node transitions are valid
 * at the TypeScript level, not just at runtime.
 *
 * @example
 * ```typescript
 * // Define the schema with all node names
 * const schema = defineNodes(['PLAN', 'IMPLEMENT', 'TEST'] as const);
 *
 * // Use schema to create nodes with type-safe transitions
 * const nodes = [
 *   schema.agent('PLAN', {
 *     prompt: 'Create a plan...',
 *     then: 'IMPLEMENT'  // ✅ TypeScript validates this
 *   }),
 *   schema.agent('IMPLEMENT', {
 *     prompt: 'Implement the plan...',
 *     then: 'INVALID'  // ❌ TypeScript error!
 *   })
 * ];
 * ```
 */

import type { ZodType } from 'zod';
import {
  NodeType,
  StdlibTool,
  AgentModel,
  WorkflowStatus,
  SpecialNode,
  END_NODE,
} from './enums';
import type { CommandSpec } from './nodes/utils/command-utils';

// Re-export command spec type for convenience
export type { CommandSpec };

// Re-export enums for convenience
export { NodeType, StdlibTool, AgentModel, WorkflowStatus, SpecialNode, END_NODE };

// ============================================================================
// Core Schema Types
// ============================================================================

/**
 * Workflow state with user-defined context.
 * This is passed to dynamic transition functions.
 */
export interface WorkflowState<TContext extends Record<string, unknown> = Record<string, unknown>> {
  /** Current node being executed */
  currentNode: string;

  /** Workflow execution status */
  status: WorkflowStatus;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;

  /** AI conversation history for resumability */
  conversationHistory: unknown[];

  /** User-defined context data */
  context: TContext;
}

/**
 * Transition function that determines the next node based on workflow state.
 * Always a function - use arrow functions for static transitions: `() => 'NEXT_NODE'`
 *
 * @example
 * ```typescript
 * // Static transition
 * then: () => 'IMPLEMENT'
 *
 * // Dynamic transition
 * then: (state) => state.context.done ? SpecialNode.End : 'RETRY'
 *
 * // Error handling
 * then: (state) => state.context.failed ? SpecialNode.Error : 'NEXT'
 * ```
 */
export type Transition<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> = (state: WorkflowState<TContext>) => TNodeNames | SpecialNode;

/**
 * Dynamic value: can be static or computed from state at runtime.
 */
export type Dynamic<T, TContext extends Record<string, unknown>> =
  | T
  | ((state: WorkflowState<TContext>) => T);

// ============================================================================
// Inline Tool Definition
// ============================================================================

/**
 * Custom tool definition with Zod schema validation.
 *
 * @template TInput - The type of the input arguments (inferred from schema)
 */
export interface InlineTool<TInput = unknown> {
  /** Unique tool name */
  name: string;

  /** Human-readable description for the AI */
  description: string;

  /** Zod schema for input validation */
  schema: ZodType<TInput>;

  /** Tool execution function */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (args: any) => Promise<unknown>;
}

/**
 * Tool reference: either a stdlib tool enum or an inline definition.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolReference = StdlibTool | InlineTool<any>;

// ============================================================================
// Base Node Definition
// ============================================================================

/**
 * Base interface for all node definitions.
 */
export interface BaseNodeDef<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> {
  /** Node type discriminator */
  type: NodeType;

  /** Node name (unique within workflow) */
  name: TNodeNames;

  /** Transition to next node */
  then: Transition<TNodeNames, TContext>;
}

// ============================================================================
// Agent Node
// ============================================================================

/**
 * Configuration for an Agent node.
 */
export interface AgentNodeConfig<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> {
  /** Role identifier for logging */
  role: string;

  /** System prompt for the AI agent */
  prompt: string;

  /** Tools available to the agent */
  capabilities?: ToolReference[];

  /** Model to use (default: Sonnet) */
  model?: AgentModel;

  /** Maximum turns for agent loop */
  maxTurns?: number;

  /** Temperature for generation (0-1) */
  temperature?: number;

  /** Transition to next node */
  then: Transition<TNodeNames, TContext>;
}

/**
 * Agent node definition.
 */
export interface AgentNodeDef<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> extends BaseNodeDef<TNodeNames, TContext> {
  type: NodeType.Agent;
  role: string;
  prompt: string;
  capabilities?: ToolReference[];
  model?: AgentModel;
  maxTurns?: number;
  temperature?: number;
}

// ============================================================================
// Command Node
// ============================================================================

/**
 * Configuration for a Command node.
 */
export interface CommandNodeConfig<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> {
  /** Shell command to execute */
  command: string;

  /** Working directory */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Whether to throw on non-zero exit code */
  throwOnError?: boolean;

  /** Transition to next node */
  then: Transition<TNodeNames, TContext>;
}

/**
 * Command node definition.
 */
export interface CommandNodeDef<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> extends BaseNodeDef<TNodeNames, TContext> {
  type: NodeType.Command;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  throwOnError?: boolean;
}

// ============================================================================
// SlashCommand Node
// ============================================================================

/**
 * Configuration for a SlashCommand node.
 */
export interface SlashCommandNodeConfig<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> {
  /** Slash command name (without leading /) */
  command: string;

  /** Arguments/instructions for the command */
  args: string;

  /** Transition to next node */
  then: Transition<TNodeNames, TContext>;
}

/**
 * SlashCommand node definition.
 */
export interface SlashCommandNodeDef<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> extends BaseNodeDef<TNodeNames, TContext> {
  type: NodeType.SlashCommand;
  command: string;
  args: string;
}

// ============================================================================
// Eval Node
// ============================================================================

/**
 * Configuration for an Eval node.
 */
export interface EvalNodeConfig<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> {
  /** Pure function that transforms context */
  update: (state: WorkflowState<TContext>) => Partial<TContext>;

  /** Transition to next node */
  then: Transition<TNodeNames, TContext>;
}

/**
 * Eval node definition (pure context transformation, no LLM).
 */
export interface EvalNodeDef<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> extends BaseNodeDef<TNodeNames, TContext> {
  type: NodeType.Eval;
  update: (state: WorkflowState<TContext>) => Partial<TContext>;
}

// ============================================================================
// Dynamic Agent Node
// ============================================================================

/**
 * Configuration for a DynamicAgent node.
 */
export interface DynamicAgentNodeConfig<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> {
  /** Model (static or dynamic) */
  model: Dynamic<AgentModel, TContext>;

  /** Prompt (static or dynamic) */
  prompt: Dynamic<string, TContext>;

  /** System prompt (static or dynamic) */
  system?: Dynamic<string, TContext>;

  /** Tools (static or dynamic) */
  capabilities?: Dynamic<ToolReference[], TContext>;

  /** Max turns (static or dynamic) */
  maxTurns?: Dynamic<number, TContext>;

  /** Temperature (static or dynamic) */
  temperature?: Dynamic<number, TContext>;

  /** Transition to next node */
  then: Transition<TNodeNames, TContext>;
}

/**
 * DynamicAgent node definition.
 */
export interface DynamicAgentNodeDef<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> extends BaseNodeDef<TNodeNames, TContext> {
  type: NodeType.DynamicAgent;
  model: Dynamic<AgentModel, TContext>;
  prompt: Dynamic<string, TContext>;
  system?: Dynamic<string, TContext>;
  capabilities?: Dynamic<ToolReference[], TContext>;
  maxTurns?: Dynamic<number, TContext>;
  temperature?: Dynamic<number, TContext>;
}

// ============================================================================
// Dynamic Command Node
// ============================================================================

/**
 * Configuration for a DynamicCommand node.
 */
export interface DynamicCommandNodeConfig<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> {
  /**
   * Command to execute (static or dynamic).
   * - String: Executed via shell (sh -c), supports pipes, redirects, etc.
   * - Array: Executed directly without shell interpretation (safer for user input)
   */
  command: Dynamic<CommandSpec, TContext>;

  /** Working directory (static or dynamic) */
  cwd?: Dynamic<string, TContext>;

  /** Environment variables (static or dynamic) */
  env?: Dynamic<Record<string, string>, TContext>;

  /** Timeout in ms (static or dynamic) */
  timeout?: Dynamic<number, TContext>;

  /** Transition to next node */
  then: Transition<TNodeNames, TContext>;
}

/**
 * DynamicCommand node definition.
 */
export interface DynamicCommandNodeDef<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> extends BaseNodeDef<TNodeNames, TContext> {
  type: NodeType.DynamicCommand;
  command: Dynamic<CommandSpec, TContext>;
  cwd?: Dynamic<string, TContext>;
  env?: Dynamic<Record<string, string>, TContext>;
  timeout?: Dynamic<number, TContext>;
}

// ============================================================================
// Union of All Node Definitions
// ============================================================================

/**
 * Union type of all possible node definitions.
 */
export type NodeDef<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> =
  | AgentNodeDef<TNodeNames, TContext>
  | CommandNodeDef<TNodeNames, TContext>
  | SlashCommandNodeDef<TNodeNames, TContext>
  | EvalNodeDef<TNodeNames, TContext>
  | DynamicAgentNodeDef<TNodeNames, TContext>
  | DynamicCommandNodeDef<TNodeNames, TContext>;

// ============================================================================
// Node Schema (Factory)
// ============================================================================

/**
 * Node schema provides type-safe factory functions for creating nodes.
 *
 * The schema is parameterized by:
 * - TNodeNames: Union of valid node names (from `as const` array)
 * - TContext: User-defined workflow context type
 */
export interface NodeSchema<
  TNodeNames extends string,
  TContext extends Record<string, unknown> = Record<string, unknown>
> {
  /** The literal node names as a readonly tuple */
  readonly names: readonly TNodeNames[];

  /**
   * Create an Agent node.
   *
   * @example
   * ```typescript
   * schema.agent('PLAN', {
   *   role: 'architect',
   *   prompt: 'Create a development plan...',
   *   capabilities: [StdlibTool.ReadFile, StdlibTool.ListFiles],
   *   then: 'IMPLEMENT'
   * })
   * ```
   */
  agent<N extends TNodeNames>(
    name: N,
    config: AgentNodeConfig<TNodeNames, TContext>
  ): AgentNodeDef<TNodeNames, TContext>;

  /**
   * Create a Command node.
   *
   * @example
   * ```typescript
   * schema.command('BUILD', {
   *   command: 'bun build',
   *   then: 'TEST'
   * })
   * ```
   */
  command<N extends TNodeNames>(
    name: N,
    config: CommandNodeConfig<TNodeNames, TContext>
  ): CommandNodeDef<TNodeNames, TContext>;

  /**
   * Create a SlashCommand node.
   *
   * @example
   * ```typescript
   * schema.slashCommand('TEST', {
   *   command: 'test',
   *   args: 'Run all tests',
   *   then: (state) => state.context.testsPassed ? 'DEPLOY' : 'FIX'
   * })
   * ```
   */
  slashCommand<N extends TNodeNames>(
    name: N,
    config: SlashCommandNodeConfig<TNodeNames, TContext>
  ): SlashCommandNodeDef<TNodeNames, TContext>;

  /**
   * Create an Eval node (pure context transformation).
   *
   * @example
   * ```typescript
   * schema.eval('INCREMENT', {
   *   update: (state) => ({
   *     counter: state.context.counter + 1
   *   }),
   *   then: (state) => state.context.counter < 5 ? 'INCREMENT' : 'DONE'
   * })
   * ```
   */
  eval<N extends TNodeNames>(
    name: N,
    config: EvalNodeConfig<TNodeNames, TContext>
  ): EvalNodeDef<TNodeNames, TContext>;

  /**
   * Create a DynamicAgent node.
   *
   * @example
   * ```typescript
   * schema.dynamicAgent('EXECUTE_TASK', {
   *   model: (state) => state.context.currentTask.model,
   *   prompt: (state) => state.context.currentTask.prompt,
   *   then: 'NEXT_TASK'
   * })
   * ```
   */
  dynamicAgent<N extends TNodeNames>(
    name: N,
    config: DynamicAgentNodeConfig<TNodeNames, TContext>
  ): DynamicAgentNodeDef<TNodeNames, TContext>;

  /**
   * Create a DynamicCommand node.
   *
   * @example
   * ```typescript
   * schema.dynamicCommand('RUN_SCRIPT', {
   *   command: (state) => state.context.scriptPath,
   *   then: 'CHECK_RESULT'
   * })
   * ```
   */
  dynamicCommand<N extends TNodeNames>(
    name: N,
    config: DynamicCommandNodeConfig<TNodeNames, TContext>
  ): DynamicCommandNodeDef<TNodeNames, TContext>;
}

// ============================================================================
// Schema Factory Implementation
// ============================================================================

/**
 * Creates a node schema with type-safe factory functions.
 *
 * The schema ensures compile-time validation of:
 * - Node names are valid (from the provided array)
 * - Transition return values are valid node names or SpecialNode values
 * - Node configurations have all required fields
 *
 * @param names - Array of valid node names (use `as const` for literal types)
 * @returns A schema object with factory functions for each node type
 *
 * @example
 * ```typescript
 * interface MyContext extends Record<string, unknown> {
 *   counter: number;
 *   done: boolean;
 * }
 *
 * const schema = defineNodes<MyContext>()(['INIT', 'PROCESS', 'FINISH'] as const);
 *
 * const nodes = [
 *   schema.eval('INIT', {
 *     update: () => ({ counter: 0, done: false }),
 *     then: () => 'PROCESS'  // Arrow function for static transition
 *   }),
 *   schema.agent('PROCESS', {
 *     role: 'processor',
 *     prompt: 'Process the data...',
 *     then: (state) => state.context.done ? 'FINISH' : 'PROCESS'
 *   }),
 *   schema.command('FINISH', {
 *     command: 'echo "Done!"',
 *     then: () => SpecialNode.End  // Use enum for special nodes
 *   })
 * ];
 * ```
 */
export function defineNodes<
  TContext extends Record<string, unknown> = Record<string, unknown>
>() {
  return function <const TNodeNames extends readonly string[]>(
    names: TNodeNames
  ): NodeSchema<TNodeNames[number], TContext> {
    type Names = TNodeNames[number];

    // Validate no duplicates and no reserved names
    const reservedNames = Object.values(SpecialNode) as string[];
    const seen = new Set<string>();
    for (const name of names) {
      if (seen.has(name)) {
        throw new Error(`Duplicate node name: "${name}"`);
      }
      if (reservedNames.includes(name)) {
        throw new Error(`"${name}" is reserved (SpecialNode) and cannot be used as a node name`);
      }
      seen.add(name);
    }

    const schema: NodeSchema<Names, TContext> = {
      names: names as readonly Names[],

      agent<N extends Names>(
        name: N,
        config: AgentNodeConfig<Names, TContext>
      ): AgentNodeDef<Names, TContext> {
        const result: AgentNodeDef<Names, TContext> = {
          type: NodeType.Agent,
          name,
          role: config.role,
          prompt: config.prompt,
          then: config.then,
        };
        if (config.capabilities !== undefined) result.capabilities = config.capabilities;
        if (config.model !== undefined) result.model = config.model;
        if (config.maxTurns !== undefined) result.maxTurns = config.maxTurns;
        if (config.temperature !== undefined) result.temperature = config.temperature;
        return result;
      },

      command<N extends Names>(
        name: N,
        config: CommandNodeConfig<Names, TContext>
      ): CommandNodeDef<Names, TContext> {
        const result: CommandNodeDef<Names, TContext> = {
          type: NodeType.Command,
          name,
          command: config.command,
          then: config.then,
        };
        if (config.cwd !== undefined) result.cwd = config.cwd;
        if (config.env !== undefined) result.env = config.env;
        if (config.timeout !== undefined) result.timeout = config.timeout;
        if (config.throwOnError !== undefined) result.throwOnError = config.throwOnError;
        return result;
      },

      slashCommand<N extends Names>(
        name: N,
        config: SlashCommandNodeConfig<Names, TContext>
      ): SlashCommandNodeDef<Names, TContext> {
        return {
          type: NodeType.SlashCommand,
          name,
          command: config.command,
          args: config.args,
          then: config.then,
        };
      },

      eval<N extends Names>(
        name: N,
        config: EvalNodeConfig<Names, TContext>
      ): EvalNodeDef<Names, TContext> {
        return {
          type: NodeType.Eval,
          name,
          update: config.update,
          then: config.then,
        };
      },

      dynamicAgent<N extends Names>(
        name: N,
        config: DynamicAgentNodeConfig<Names, TContext>
      ): DynamicAgentNodeDef<Names, TContext> {
        const result: DynamicAgentNodeDef<Names, TContext> = {
          type: NodeType.DynamicAgent,
          name,
          model: config.model,
          prompt: config.prompt,
          then: config.then,
        };
        if (config.system !== undefined) result.system = config.system;
        if (config.capabilities !== undefined) result.capabilities = config.capabilities;
        if (config.maxTurns !== undefined) result.maxTurns = config.maxTurns;
        if (config.temperature !== undefined) result.temperature = config.temperature;
        return result;
      },

      dynamicCommand<N extends Names>(
        name: N,
        config: DynamicCommandNodeConfig<Names, TContext>
      ): DynamicCommandNodeDef<Names, TContext> {
        const result: DynamicCommandNodeDef<Names, TContext> = {
          type: NodeType.DynamicCommand,
          name,
          command: config.command,
          then: config.then,
        };
        if (config.cwd !== undefined) result.cwd = config.cwd;
        if (config.env !== undefined) result.env = config.env;
        if (config.timeout !== undefined) result.timeout = config.timeout;
        return result;
      },
    };

    return schema;
  };
}

// ============================================================================
// Workflow Configuration
// ============================================================================

/**
 * Complete workflow configuration.
 */
export interface WorkflowConfig<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
> {
  /** Unique workflow identifier */
  id: string;

  /** Node schema (defines valid node names) */
  schema: NodeSchema<TNodeNames, TContext>;

  /** Array of node definitions (first node is entry point) */
  nodes: NodeDef<TNodeNames, TContext>[];

  /** Initial context values */
  initialContext?: Partial<TContext>;
}

/**
 * Defines a complete workflow with type-safe validation.
 *
 * @example
 * ```typescript
 * const schema = defineNodes<MyContext>()(['PLAN', 'IMPLEMENT', 'END'] as const);
 *
 * export default defineWorkflow({
 *   id: 'my-workflow',
 *   schema,
 *   nodes: [
 *     schema.agent('PLAN', { ... }),
 *     schema.agent('IMPLEMENT', { ... }),
 *   ],
 *   initialContext: {
 *     counter: 0
 *   }
 * });
 * ```
 */
export function defineWorkflow<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
>(
  config: WorkflowConfig<TNodeNames, TContext>
): WorkflowConfig<TNodeNames, TContext> {
  // Validate workflow ID
  if (!config.id || typeof config.id !== 'string' || config.id.trim() === '') {
    throw new Error('Workflow must have a non-empty string "id"');
  }

  // Validate nodes array
  if (!Array.isArray(config.nodes) || config.nodes.length === 0) {
    throw new Error('Workflow must have at least one node');
  }

  // Validate all schema names are used
  const schemaNames = new Set(config.schema.names);

  // Check for nodes not in schema (should be impossible with types, but check anyway)
  for (const node of config.nodes) {
    if (!schemaNames.has(node.name)) {
      throw new Error(
        `Node "${node.name}" is not defined in schema. ` +
        `Valid names: ${config.schema.names.join(', ')}`
      );
    }
  }

  // Check for duplicate node definitions
  const seenNames = new Set<string>();
  for (const node of config.nodes) {
    if (seenNames.has(node.name)) {
      throw new Error(`Duplicate node definition: "${node.name}"`);
    }
    seenNames.add(node.name);
  }

  // Validate transitions are functions
  for (const node of config.nodes) {
    if (typeof node.then !== 'function') {
      throw new Error(
        `Node "${node.name}" has invalid transition. ` +
        `"then" must be a function. Use arrow functions for static transitions: () => 'NEXT_NODE'`
      );
    }
  }

  return config;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates an initial workflow state for execution.
 *
 * @param config - The workflow configuration
 * @returns A properly initialized WorkflowState ready for execution
 *
 * @example
 * ```typescript
 * const workflow = defineWorkflow({ ... });
 * const initialState = createInitialWorkflowState(workflow);
 * await engine.run(workflow.id, initialState);
 * ```
 */
export function createInitialWorkflowState<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
>(
  config: WorkflowConfig<TNodeNames, TContext>
): WorkflowState<TContext> {
  const firstNode = config.nodes[0];
  if (!firstNode) {
    throw new Error('Workflow must have at least one node');
  }

  return {
    currentNode: firstNode.name,
    status: WorkflowStatus.Pending,
    updatedAt: new Date().toISOString(),
    conversationHistory: [],
    context: (config.initialContext ?? {}) as TContext,
  };
}

/**
 * Resolves a dynamic value to its actual value.
 *
 * @param value - Static value or function that computes the value
 * @param state - Current workflow state (for dynamic resolution)
 * @returns The resolved value
 */
export function resolveDynamic<T, TContext extends Record<string, unknown>>(
  value: Dynamic<T, TContext>,
  state: WorkflowState<TContext>
): T {
  if (typeof value === 'function') {
    return (value as (state: WorkflowState<TContext>) => T)(state);
  }
  return value;
}
