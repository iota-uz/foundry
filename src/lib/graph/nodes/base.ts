/**
 * @sys/graph - Abstract Base Node
 *
 * Defines the foundation for all standard library nodes.
 * Provides common utilities for execution, logging, transition handling,
 * and state management.
 */

import type {
  WorkflowState,
  GraphContext,
  ToolReference,
  InlineTool,
} from '../types';

/**
 * Result of node execution, containing state updates.
 */
export interface NodeExecutionResult<TContext extends Record<string, unknown>> {
  /** Partial state to merge with the current state */
  stateUpdate: Partial<WorkflowState<TContext>>;
  /** Optional execution metadata for logging/debugging */
  metadata?: {
    duration?: number;
    toolsUsed?: string[];
    [key: string]: unknown;
  };
}

/**
 * Transition can be a static string or a dynamic function.
 */
type BaseTransition<TContext extends Record<string, unknown>> =
  | string
  | ((state: WorkflowState<TContext>) => string);

/**
 * Configuration common to all node types.
 */
export interface BaseNodeConfig<TContext extends Record<string, unknown>> {
  /**
   * Transition to the next node.
   * Can be a static string (e.g., 'IMPLEMENT') or a function for conditional routing.
   */
  next: BaseTransition<TContext>;
}

/**
 * Abstract base class for all stdlib nodes.
 *
 * Provides:
 * - Structured execution lifecycle
 * - Automatic logging
 * - Transition resolution
 * - Error handling patterns
 *
 * @example
 * ```typescript
 * class MyCustomNode<T extends Record<string, unknown>>
 *   extends BaseNode<T, MyNodeConfig<T>> {
 *
 *   async execute(state, context) {
 *     // Custom execution logic
 *     return { stateUpdate: { context: { ...state.context, done: true } } };
 *   }
 * }
 * ```
 */
export abstract class BaseNode<
  TContext extends Record<string, unknown>,
  TConfig extends BaseNodeConfig<TContext>,
> {
  /** The node's configuration */
  protected readonly config: TConfig;

  /** Node type identifier for serialization/logging */
  public abstract readonly nodeType: string;

  constructor(config: TConfig) {
    this.config = config;
  }

  /**
   * Core execution logic - must be implemented by subclasses.
   *
   * @param state - Current workflow state
   * @param context - Execution context with agent and logger
   * @returns Execution result with state updates
   */
  abstract execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>>;

  /**
   * Resolves the next node based on the current state.
   * Supports both static (string) and dynamic (function) transitions.
   *
   * @param state - Current workflow state after execution
   * @returns The name of the next node
   */
  resolveNext(state: WorkflowState<TContext>): string {
    const transition = this.config.next;

    if (typeof transition === 'function') {
      return transition(state);
    }

    return transition;
  }

  /**
   * Wraps execution with logging and error handling.
   * Called by the engine instead of execute directly.
   *
   * @param nodeName - Name of the current node (for logging)
   * @param state - Current workflow state
   * @param context - Execution context
   * @returns Execution result
   */
  async run(
    nodeName: string,
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const startTime = Date.now();
    context.logger.info(`[${this.nodeType}:${nodeName}] Starting execution`);

    try {
      const result = await this.execute(state, context);

      const duration = Date.now() - startTime;
      context.logger.info(
        `[${this.nodeType}:${nodeName}] Completed in ${duration}ms`
      );

      // Add duration metadata if not already present
      return {
        ...result,
        metadata: {
          ...result.metadata,
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      context.logger.error(
        `[${this.nodeType}:${nodeName}] Failed after ${duration}ms:`,
        error
      );
      throw error;
    }
  }
}

/**
 * Type guard to check if a tool reference is an inline definition.
 */
export function isInlineToolDefinition(
  tool: ToolReference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): tool is InlineTool<any> {
  return typeof tool === 'object' && 'name' in tool && 'schema' in tool;
}

/**
 * Error thrown when a node execution fails.
 * Provides structured error information for debugging and state management.
 */
export class NodeExecutionError extends Error {
  constructor(
    message: string,
    public readonly nodeName: string,
    public readonly nodeType: string,
    public readonly cause?: Error,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NodeExecutionError';
  }
}
