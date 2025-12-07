/**
 * @sys/graph - Core type definitions
 *
 * Generic interfaces for building stateful agentic workflows with
 * built-in resumability and context management.
 */

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

/**
 * Alias for SDK message type for conversation history.
 * The SDK uses SDKMessage as the unified message type.
 */
export type Message = SDKMessage;

/**
 * Simplified stored message for serialization.
 * Used when persisting conversation history to disk.
 */
export interface StoredMessage {
  type: 'user' | 'assistant' | 'result' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * The minimal requirement for any state object managed by this library.
 * All workflow states must extend this interface.
 */
export interface BaseState {
  /** The ID of the active node in the FSM */
  currentNode: string;

  /** Execution metadata */
  status: 'pending' | 'running' | 'completed' | 'failed';
  updatedAt: string;

  /**
   * Persistence of the AI's short-term memory.
   * This allows the SDK to "wake up" remembering the previous conversation.
   * Can be SDK messages or simplified stored messages for serialization.
   */
  conversationHistory: Array<Message | StoredMessage>;
}

/**
 * Context provided to node execution functions.
 * Contains the agent wrapper and utilities for workflow execution.
 */
export interface GraphContext {
  /** Wrapper around the Claude Agent SDK for executing AI operations */
  agent: IAgentWrapper;

  /** Structured logger for debugging and observability */
  logger: Console;
}

/**
 * A unit of work in the graph.
 * Represents a single step in the workflow FSM.
 */
export interface GraphNode<TState extends BaseState> {
  /** Unique identifier for this node */
  name: string;

  /**
   * The business logic for this node.
   * Can use the context.agent to perform AI work.
   *
   * @param state - Current state of the workflow
   * @param context - Execution context with agent and logger
   * @returns Partial state to be merged with current state
   */
  execute(state: TState, context: GraphContext): Promise<Partial<TState>>;

  /**
   * Deterministic routing logic.
   * Based on the state *after* execution, decide where to go next.
   *
   * @param state - Updated state after execution
   * @returns Name of the next node, or 'END' to terminate the graph
   */
  next(state: TState): string;
}

/**
 * Agent wrapper interface for dependency injection.
 * Allows mocking in tests and provides a clean abstraction.
 */
export interface IAgentWrapper {
  /**
   * Runs a single turn of the agent.
   *
   * @param state - Current workflow state (for hydration)
   * @param userInstruction - The instruction/prompt for this turn
   * @param tools - SDK-compatible tool definitions
   * @returns Updated conversation history and response
   */
  runStep<T extends BaseState>(
    state: T,
    userInstruction: string,
    tools: unknown[]
  ): Promise<{
    response: string;
    updatedHistory: Array<Message | StoredMessage>;
  }>;
}

/**
 * Configuration options for the graph engine.
 */
export interface GraphEngineConfig {
  /** Anthropic API key for Claude SDK */
  apiKey: string;

  /** Claude model to use (default: claude-3-5-sonnet-20241022) */
  model?: string;

  /** Maximum retries for failed nodes (default: 0) */
  maxRetries?: number;
}

// ============================================================================
// Workflow Config Types - User-facing API for atomic.config.ts
// ============================================================================

/**
 * Extended workflow state that includes user-defined context.
 * This is the state type used by workflow configurations.
 */
export interface WorkflowState<TContext extends Record<string, unknown> = Record<string, unknown>>
  extends BaseState {
  /**
   * User-defined context for passing data between nodes.
   * This is where you store plan details, test results, etc.
   */
  context: TContext;
}

/**
 * Static transition - a fixed string node name.
 */
export type StaticTransition = string;

/**
 * Dynamic transition - a function that determines the next node based on state.
 */
export type DynamicTransition<TContext extends Record<string, unknown> = Record<string, unknown>> = (
  state: WorkflowState<TContext>
) => string;

/**
 * Transition can be either static (string) or dynamic (function).
 */
export type Transition<TContext extends Record<string, unknown> = Record<string, unknown>> =
  | StaticTransition
  | DynamicTransition<TContext>;

/**
 * Base interface for all node definitions in the config.
 * Each node type (AgentNode, CommandNode, etc.) extends this.
 */
export interface BaseNodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>> {
  /** The type discriminator for the node */
  type: string;

  /**
   * Transition to the next node.
   * Can be a static string (e.g., 'IMPLEMENT') or a function for conditional routing.
   */
  next: Transition<TContext>;
}

/**
 * Tool definition that can be used within agent nodes.
 * Supports both string references to stdlib tools and custom inline tools.
 *
 * @template TInput - The type of the input arguments (inferred from schema)
 */
export interface InlineToolDefinition<TInput = unknown> {
  /** Unique tool name (used by the AI to invoke it) */
  name: string;

  /** Human-readable description for the AI model */
  description?: string;

  /**
   * Zod schema for input validation.
   * The execute function's args type should match this schema's output type.
   */
  schema: import('zod').ZodType<TInput>;

  /** Tool execution function - receives validated args matching the schema */
  execute: (args: TInput) => Promise<unknown>;
}

/**
 * Tool can be a string reference (stdlib) or an inline definition.
 */
export type ToolReference = string | InlineToolDefinition<unknown>;

/**
 * AgentNode definition - a node that runs an AI agent.
 */
export interface AgentNodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>>
  extends BaseNodeDefinition<TContext> {
  type: 'agent';

  /** Role identifier for logging and debugging */
  role: string;

  /** System prompt for the AI agent */
  system: string;

  /** Tools available to the agent */
  tools?: ToolReference[] | undefined;
}

/**
 * CommandNode definition - a node that runs a shell command.
 */
export interface CommandNodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>>
  extends BaseNodeDefinition<TContext> {
  type: 'command';

  /** Shell command to execute */
  command: string;
}

/**
 * SlashCommandNode definition - a node that runs Claude Code slash commands.
 */
export interface SlashCommandNodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>>
  extends BaseNodeDefinition<TContext> {
  type: 'slash-command';

  /** The slash command to run (without the leading /) */
  command: string;

  /** Arguments/instructions for the command */
  args: string;
}

/**
 * GitHubProjectNode definition - a node that updates GitHub Project status.
 *
 * All fields are explicit - use process.env.* if you need environment variables.
 */
export interface GitHubProjectNodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>>
  extends BaseNodeDefinition<TContext> {
  type: 'github-project';

  /** GitHub token with project scope */
  token: string;

  /** Project owner (user or organization) */
  projectOwner: string;

  /** Project number (from project URL) */
  projectNumber: number;

  /** Repository owner */
  owner: string;

  /** Repository name */
  repo: string;

  /** Target status to set (must match project option) */
  status: string;

  /** Issue number (or use issueNumberKey to read from context) */
  issueNumber?: number;

  /** Context key to read issue number from */
  issueNumberKey?: string;
}

// ============================================================================
// Primitive Node Types (Dynamic/Composable)
// ============================================================================

/**
 * Model selection for DynamicAgentNode.
 */
export type AgentModel = 'haiku' | 'sonnet' | 'opus';

/**
 * Dynamic value: static or computed from state at runtime.
 *
 * @example
 * ```typescript
 * // Static value
 * model: 'sonnet'
 *
 * // Dynamic value from state
 * model: (state) => state.context.currentTask.model
 * ```
 */
export type Dynamic<T, TContext extends Record<string, unknown>> =
  | T
  | ((state: WorkflowState<TContext>) => T);

/**
 * EvalNode definition - pure context transformation without LLM calls.
 *
 * Use for loop control, index management, array operations, and
 * conditional value assignment.
 */
export interface EvalNodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>>
  extends BaseNodeDefinition<TContext> {
  type: 'eval';

  /**
   * Pure function that transforms context.
   * Receives current state, returns partial context to merge.
   */
  fn: (state: WorkflowState<TContext>) => Partial<TContext>;
}

/**
 * DynamicAgentNode definition - AI agent with runtime configuration.
 *
 * Unlike static AgentNode, all configuration can be resolved dynamically
 * from workflow state at execution time.
 */
export interface DynamicAgentNodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>>
  extends BaseNodeDefinition<TContext> {
  type: 'dynamic-agent';

  /** Model to use (static or dynamic) */
  model: Dynamic<AgentModel, TContext>;

  /** Prompt for the agent (static or dynamic) */
  prompt: Dynamic<string, TContext>;

  /** Optional system prompt (static or dynamic) */
  system?: Dynamic<string, TContext>;

  /** Tools available to the agent (static or dynamic) */
  tools?: Dynamic<ToolReference[], TContext>;

  /** Maximum turns for the agent loop (static or dynamic) */
  maxTurns?: Dynamic<number, TContext>;

  /** Temperature for generation (static or dynamic) */
  temperature?: Dynamic<number, TContext>;

  /** Maximum tokens to generate (static or dynamic) */
  maxTokens?: Dynamic<number, TContext>;
}

/**
 * DynamicCommandNode definition - shell command with runtime configuration.
 *
 * Unlike static CommandNode, all configuration can be resolved dynamically
 * from workflow state at execution time.
 */
export interface DynamicCommandNodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>>
  extends BaseNodeDefinition<TContext> {
  type: 'dynamic-command';

  /** Shell command to execute (static or dynamic) */
  command: Dynamic<string, TContext>;

  /** Working directory (static or dynamic) */
  cwd?: Dynamic<string, TContext>;

  /** Environment variables (static or dynamic) */
  env?: Dynamic<Record<string, string>, TContext>;

  /** Timeout in milliseconds (static or dynamic) */
  timeout?: Dynamic<number, TContext>;
}

/**
 * Union type of all supported node definitions.
 */
export type NodeDefinition<TContext extends Record<string, unknown> = Record<string, unknown>> =
  | AgentNodeDefinition<TContext>
  | CommandNodeDefinition<TContext>
  | SlashCommandNodeDefinition<TContext>
  | GitHubProjectNodeDefinition<TContext>
  | EvalNodeDefinition<TContext>
  | DynamicAgentNodeDefinition<TContext>
  | DynamicCommandNodeDefinition<TContext>;

/**
 * The main workflow configuration schema.
 * This is what users export from atomic.config.ts.
 */
export interface WorkflowConfig<TContext extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique workflow identifier */
  id: string;

  /** Initial state values (optional) */
  initialState?: Partial<WorkflowState<TContext>>;

  /** Node definitions keyed by node name */
  nodes: Record<string, NodeDefinition<TContext>>;
}

/**
 * Error thrown when config validation fails.
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Result of loading and validating a workflow config.
 */
export interface LoadedConfig<TContext extends Record<string, unknown> = Record<string, unknown>> {
  /** The validated workflow configuration */
  config: WorkflowConfig<TContext>;

  /** Path to the config file */
  configPath: string;

  /** All valid node names (including 'END') */
  validNodeNames: Set<string>;
}
