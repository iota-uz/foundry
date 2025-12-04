/**
 * @sys/graph - Core type definitions
 *
 * Generic interfaces for building stateful agentic workflows with
 * built-in resumability and context management.
 */

import type { Message } from '@anthropic-ai/claude-agent-sdk';

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
   */
  conversationHistory: Message[];
}

/**
 * Context provided to node execution functions.
 * Contains the agent wrapper and utilities for workflow execution.
 */
export interface GraphContext {
  /** Wrapper around the Claude Agent SDK for executing AI operations */
  agent: AgentWrapper;

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
export interface AgentWrapper {
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
    tools: any[]
  ): Promise<{
    response: string;
    updatedHistory: Message[];
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
