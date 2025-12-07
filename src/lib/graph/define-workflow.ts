/**
 * @sys/graph - Workflow Definition API
 *
 * Provides the user-facing API for declaring type-safe atomic workflows.
 * This is the primary entrypoint for authors to define their workflows.
 */

import type {
  WorkflowConfig,
  WorkflowState,
  AgentNodeDefinition,
  CommandNodeDefinition,
  SlashCommandNodeDefinition,
  EvalNodeDefinition,
  DynamicAgentNodeDefinition,
  DynamicCommandNodeDefinition,
  Transition,
  ToolReference,
  Dynamic,
  AgentModel,
} from './types';

/**
 * Creates an AgentNode definition.
 * AgentNodes run an AI agent with the specified system prompt and tools.
 *
 * @example
 * ```typescript
 * nodes.AgentNode({
 *   role: 'architect',
 *   system: 'You are a Tech Lead. Output a JSON plan.',
 *   tools: ['list_files', 'read_file'],
 *   next: 'IMPLEMENT'
 * })
 * ```
 */
export function AgentNode<TContext extends Record<string, unknown> = Record<string, unknown>>(config: {
  /** Role identifier for logging and debugging */
  role: string;
  /** System prompt for the AI agent */
  system: string;
  /** Tools available to the agent (stdlib names or inline definitions) */
  tools?: ToolReference[] | undefined;
  /** Transition to next node (static string or dynamic function) */
  next: Transition<TContext>;
}): AgentNodeDefinition<TContext> {
  return {
    type: 'agent',
    role: config.role,
    system: config.system,
    tools: config.tools,
    next: config.next,
  };
}

/**
 * Creates a CommandNode definition.
 * CommandNodes execute shell commands.
 *
 * @example
 * ```typescript
 * nodes.CommandNode({
 *   command: 'gh pr create --fill',
 *   next: 'END'
 * })
 * ```
 */
export function CommandNode<TContext extends Record<string, unknown> = Record<string, unknown>>(config: {
  /** Shell command to execute */
  command: string;
  /** Transition to next node (static string or dynamic function) */
  next: Transition<TContext>;
}): CommandNodeDefinition<TContext> {
  return {
    type: 'command',
    command: config.command,
    next: config.next,
  };
}

/**
 * Creates a SlashCommandNode definition.
 * SlashCommandNodes execute Claude Code slash commands (/edit, /test, etc.).
 *
 * @example
 * ```typescript
 * nodes.SlashCommandNode({
 *   command: 'edit',
 *   args: 'Add error handling to src/utils.ts',
 *   next: 'TEST'
 * })
 * ```
 */
export function SlashCommandNode<TContext extends Record<string, unknown> = Record<string, unknown>>(config: {
  /** The slash command to run (without the leading /) */
  command: string;
  /** Arguments/instructions for the command */
  args: string;
  /** Transition to next node (static string or dynamic function) */
  next: Transition<TContext>;
}): SlashCommandNodeDefinition<TContext> {
  return {
    type: 'slash-command',
    command: config.command,
    args: config.args,
    next: config.next,
  };
}

/**
 * Creates an EvalNode definition.
 * EvalNodes perform pure context transformations without LLM calls.
 *
 * @example
 * ```typescript
 * nodes.EvalNode({
 *   fn: (state) => ({
 *     currentIndex: state.context.currentIndex + 1,
 *     currentTask: state.context.tasks[state.context.currentIndex + 1],
 *   }),
 *   next: (state) => state.context.currentTask ? 'EXECUTE' : 'DONE',
 * })
 * ```
 */
export function EvalNode<TContext extends Record<string, unknown> = Record<string, unknown>>(config: {
  /** Pure function that transforms context */
  fn: (state: WorkflowState<TContext>) => Partial<TContext>;
  /** Transition to next node (static string or dynamic function) */
  next: Transition<TContext>;
}): EvalNodeDefinition<TContext> {
  return {
    type: 'eval',
    fn: config.fn,
    next: config.next,
  };
}

/**
 * Creates a DynamicAgentNode definition.
 * DynamicAgentNodes run an AI agent with configuration resolved at runtime.
 *
 * @example
 * ```typescript
 * nodes.DynamicAgentNode({
 *   model: (state) => state.context.currentTask.model,
 *   prompt: (state) => state.context.currentTask.prompt,
 *   tools: ['read_file', 'write_file'],
 *   next: 'COLLECT_RESULT',
 * })
 * ```
 */
export function DynamicAgentNode<TContext extends Record<string, unknown> = Record<string, unknown>>(config: {
  /** Model to use (static or dynamic) */
  model: Dynamic<AgentModel, TContext>;
  /** Prompt for the agent (static or dynamic) */
  prompt: Dynamic<string, TContext>;
  /** Optional system prompt (separate from user prompt) */
  system?: Dynamic<string, TContext>;
  /** Tools available to the agent (static or dynamic) */
  tools?: Dynamic<ToolReference[], TContext>;
  /** Maximum turns for the agent loop */
  maxTurns?: Dynamic<number, TContext>;
  /** Temperature for generation */
  temperature?: Dynamic<number, TContext>;
  /** Maximum tokens to generate */
  maxTokens?: Dynamic<number, TContext>;
  /** Transition to next node (static string or dynamic function) */
  next: Transition<TContext>;
}): DynamicAgentNodeDefinition<TContext> {
  const result: DynamicAgentNodeDefinition<TContext> = {
    type: 'dynamic-agent',
    model: config.model,
    prompt: config.prompt,
    next: config.next,
  };

  if (config.system !== undefined) result.system = config.system;
  if (config.tools !== undefined) result.tools = config.tools;
  if (config.maxTurns !== undefined) result.maxTurns = config.maxTurns;
  if (config.temperature !== undefined) result.temperature = config.temperature;
  if (config.maxTokens !== undefined) result.maxTokens = config.maxTokens;

  return result;
}

/**
 * Creates a DynamicCommandNode definition.
 * DynamicCommandNodes execute shell commands with configuration resolved at runtime.
 *
 * @example
 * ```typescript
 * nodes.DynamicCommandNode({
 *   command: (state) => state.context.currentTask.command,
 *   cwd: (state) => state.context.workDir,
 *   next: 'CHECK_RESULT',
 * })
 * ```
 */
export function DynamicCommandNode<TContext extends Record<string, unknown> = Record<string, unknown>>(config: {
  /** Shell command to execute (static or dynamic) */
  command: Dynamic<string, TContext>;
  /** Working directory (static or dynamic) */
  cwd?: Dynamic<string, TContext>;
  /** Environment variables (static or dynamic) */
  env?: Dynamic<Record<string, string>, TContext>;
  /** Timeout in milliseconds (static or dynamic) */
  timeout?: Dynamic<number, TContext>;
  /** Transition to next node (static string or dynamic function) */
  next: Transition<TContext>;
}): DynamicCommandNodeDefinition<TContext> {
  const result: DynamicCommandNodeDefinition<TContext> = {
    type: 'dynamic-command',
    command: config.command,
    next: config.next,
  };

  if (config.cwd !== undefined) result.cwd = config.cwd;
  if (config.env !== undefined) result.env = config.env;
  if (config.timeout !== undefined) result.timeout = config.timeout;

  return result;
}

/**
 * Node factory functions for use in workflow configurations.
 * These provide a clean API for defining different node types.
 */
export const nodes = {
  AgentNode,
  CommandNode,
  SlashCommandNode,
  // Primitive nodes for dynamic workflows
  EvalNode,
  DynamicAgentNode,
  DynamicCommandNode,
} as const;

/**
 * Defines a type-safe workflow configuration.
 *
 * This is the primary user-facing API for declaring atomic workflows.
 * It provides compile-time type checking and runtime validation.
 *
 * @example
 * ```typescript
 * import { defineWorkflow, nodes } from '@sys/graph';
 *
 * export default defineWorkflow({
 *   id: 'feature-development',
 *   nodes: {
 *     PLAN: nodes.AgentNode({
 *       role: 'architect',
 *       system: 'You are a Tech Lead. Output a JSON plan.',
 *       tools: ['list_files', 'read_file'],
 *       next: 'IMPLEMENT'
 *     }),
 *     IMPLEMENT: nodes.AgentNode({
 *       role: 'builder',
 *       system: 'Implement the planned tasks.',
 *       tools: ['write_file', 'read_file'],
 *       next: (state) => state.context.allTasksDone ? 'QA' : 'IMPLEMENT'
 *     }),
 *     // ... more nodes
 *   }
 * });
 * ```
 *
 * @param config - The workflow configuration
 * @returns The validated workflow configuration (passthrough for type inference)
 */
export function defineWorkflow<TContext extends Record<string, unknown> = Record<string, unknown>>(
  config: WorkflowConfig<TContext>
): WorkflowConfig<TContext> {
  // Validate that the config has required fields
  if (!config.id || typeof config.id !== 'string') {
    throw new Error('Workflow config must have a string "id" property');
  }

  if (!config.nodes || typeof config.nodes !== 'object') {
    throw new Error('Workflow config must have a "nodes" object');
  }

  const nodeNames = Object.keys(config.nodes);
  if (nodeNames.length === 0) {
    throw new Error('Workflow must define at least one node');
  }

  // Validate each node has required properties
  for (const [nodeName, node] of Object.entries(config.nodes)) {
    if (!node) {
      throw new Error(`Node "${nodeName}" is undefined`);
    }

    if (!node.type) {
      throw new Error(`Node "${nodeName}" must have a "type" property`);
    }

    if (node.next === undefined) {
      throw new Error(`Node "${nodeName}" must have a "next" property`);
    }

    // Type-specific validation
    if (node.type === 'agent') {
      const agentNode = node as AgentNodeDefinition<TContext>;
      if (!agentNode.role || typeof agentNode.role !== 'string') {
        throw new Error(`AgentNode "${nodeName}" must have a string "role" property`);
      }
      if (!agentNode.system || typeof agentNode.system !== 'string') {
        throw new Error(`AgentNode "${nodeName}" must have a string "system" property`);
      }
    } else if (node.type === 'command') {
      const commandNode = node as CommandNodeDefinition<TContext>;
      if (!commandNode.command || typeof commandNode.command !== 'string') {
        throw new Error(`CommandNode "${nodeName}" must have a string "command" property`);
      }
    } else if (node.type === 'slash-command') {
      const slashCommandNode = node as SlashCommandNodeDefinition<TContext>;
      if (!slashCommandNode.command || typeof slashCommandNode.command !== 'string') {
        throw new Error(`SlashCommandNode "${nodeName}" must have a string "command" property`);
      }
      if (!slashCommandNode.args || typeof slashCommandNode.args !== 'string') {
        throw new Error(`SlashCommandNode "${nodeName}" must have a string "args" property`);
      }
    }
  }

  return config;
}

/**
 * Helper type to extract the context type from a workflow config.
 * Useful for type inference in downstream code.
 */
export type ExtractContext<T> = T extends WorkflowConfig<infer C> ? C : never;

/**
 * Helper type to create a WorkflowState with the given context.
 * Useful for initializing state in tests or CLI.
 */
export type WorkflowStateOf<TConfig> = TConfig extends WorkflowConfig<infer C>
  ? WorkflowState<C>
  : never;

/**
 * Creates an initial workflow state with default values.
 * This is a helper for creating the initial state when running a workflow.
 *
 * @param startNode - The name of the first node to execute
 * @param context - Initial context values (optional)
 * @returns A properly initialized WorkflowState
 */
export function createInitialState<TContext extends Record<string, unknown> = Record<string, unknown>>(
  startNode: string,
  context?: TContext
): WorkflowState<TContext> {
  return {
    currentNode: startNode,
    status: 'pending',
    updatedAt: new Date().toISOString(),
    conversationHistory: [],
    context: (context ?? {}) as TContext,
  };
}
