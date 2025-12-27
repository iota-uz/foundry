/**
 * @sys/graph - Core Runtime Types
 *
 * This module contains the core runtime types used by the graph engine.
 * For workflow definition types, use the schema API from './schema'.
 *
 * @module
 */

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { WorkflowStatus as WorkflowStatusEnum } from './enums';

// ============================================================================
// Re-export v2 Schema Types (Canonical API)
// ============================================================================

export type {
  // Core workflow types
  WorkflowState,
  Dynamic,
  // Tool types
  ToolReference,
  InlineTool,
  // Node definitions
  NodeDef,
  AgentNodeDef,
  CommandNodeDef,
  SlashCommandNodeDef,
  EvalNodeDef,
  DynamicAgentNodeDef,
  DynamicCommandNodeDef,
  // Node configs
  AgentNodeConfig,
  CommandNodeConfig,
  SlashCommandNodeConfig,
  EvalNodeConfig,
  DynamicAgentNodeConfig,
  DynamicCommandNodeConfig,
  // Schema and workflow config
  NodeSchema,
  WorkflowConfig,
  // Transition type (v2 with two generic args)
  Transition as TransitionV2,
} from './schema';

// Re-export commonly used functions and enums
export {
  defineNodes,
  defineWorkflow,
  createInitialWorkflowState,
  resolveDynamic,
  NodeType,
  StdlibTool,
  AgentModel,
  WorkflowStatus,
  SpecialNode,
  END_NODE,
} from './schema';

// ============================================================================
// Runtime Transition Types (single generic argument)
// ============================================================================

import type { WorkflowState } from './schema';

/**
 * Transition function that determines the next node.
 * Always a function - use arrow functions for static transitions: `() => 'NEXT_NODE'`
 *
 * This is the runtime-compatible version with single generic argument,
 * used by node runtime classes.
 */
export type Transition<TContext extends Record<string, unknown>> = (
  state: WorkflowState<TContext>
) => string;

// ============================================================================
// Message Types
// ============================================================================

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

// ============================================================================
// Runtime Engine Types
// ============================================================================

/**
 * The minimal requirement for any state object managed by this library.
 * All workflow states must extend this interface.
 */
export interface BaseState {
  /** The ID of the active node in the FSM */
  currentNode: string;

  /** Execution metadata */
  status: WorkflowStatusEnum;
  updatedAt: string;

  /**
   * Persistence of the AI's short-term memory.
   * This allows the SDK to "wake up" remembering the previous conversation.
   * Using unknown[] for flexibility - actual SDK types are handled at runtime.
   */
  conversationHistory: unknown[];

  /**
   * Workflow context data.
   * Stores runtime variables including port data for typed data flow.
   *
   * Reserved metadata fields (prefixed with __):
   * - __portData: Port output data from executed nodes
   * - __portMappings: Port input mappings for each node
   * - __endNodeMappings: Maps End node ID to target status (from schema converter)
   * - __endNodeTargets: Maps source node ID to End node ID (from schema converter)
   * - __reachedEndNodeId: ID of the End node that was reached (set by engine on completion)
   */
  context?: Record<string, unknown>;
}

/**
 * Port data structure for typed data flow between nodes.
 * Key: port id, Value: port data
 */
export type PortInputs = Record<string, unknown>;

/**
 * Context provided to node execution functions.
 * Contains the agent wrapper and utilities for workflow execution.
 */
export interface GraphContext {
  /** Wrapper around the Claude Agent SDK for executing AI operations */
  agent: IAgentWrapper;

  /** Structured logger for debugging and observability */
  logger: {
    debug(message: string, attributes?: Record<string, unknown>): void;
    info(message: string, attributes?: Record<string, unknown>): void;
    warn(message: string, attributes?: Record<string, unknown>): void;
    error(message: string, attributes?: Record<string, unknown>): void;
  };

  /**
   * Resolved port inputs for this node.
   * Values are pulled from connected output ports of upstream nodes.
   * Key: input port id, Value: data from connected output port
   */
  portInputs?: PortInputs;

  /**
   * Execution ID for streaming activity events.
   * When set, nodes can emit real-time activity events.
   */
  executionId?: string | undefined;
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
/**
 * Options for streaming activity events during agent execution.
 */
export interface AgentStreamingOptions {
  /** Execution ID for broadcasting events */
  executionId: string;
  /** Node ID where execution is happening */
  nodeId: string;
  /** Whether to stream text deltas (can be noisy) */
  streamTextDeltas?: boolean;
}

export interface IAgentWrapper {
  /**
   * Runs a single turn of the agent.
   *
   * @param state - Current workflow state (for hydration)
   * @param userInstruction - The instruction/prompt for this turn
   * @param tools - SDK-compatible tool definitions
   * @param streaming - Optional streaming options for real-time activity events
   * @returns Updated conversation history and response
   */
  runStep<T extends BaseState>(
    state: T,
    userInstruction: string,
    tools: unknown[],
    streaming?: AgentStreamingOptions
  ): Promise<{
    response: string;
    updatedHistory: unknown[];
    toolsUsed?: string[] | undefined;
  }>;
}

/**
 * Configuration options for the graph engine.
 */
export interface GraphEngineConfig {
  /** Anthropic API key for Claude SDK */
  apiKey: string;

  /** Claude model to use (default: claude-sonnet-4.5) */
  model?: string;

  /** Maximum retries for failed nodes (default: 0) */
  maxRetries?: number;
}

// ============================================================================
// Errors
// ============================================================================

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
export interface LoadedConfig<
  TNodeNames extends string = string,
  TContext extends Record<string, unknown> = Record<string, unknown>
> {
  /** The validated workflow configuration */
  config: import('./schema').WorkflowConfig<TNodeNames, TContext>;

  /** Path to the config file */
  configPath: string;

  /** All valid node names (including 'END') */
  validNodeNames: Set<string>;
}
