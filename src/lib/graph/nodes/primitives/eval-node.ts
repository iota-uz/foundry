/**
 * @sys/graph - EvalNode Implementation
 *
 * Pure context transformation node. Executes a synchronous function
 * on the current state and returns partial context updates.
 * No LLM calls - purely programmatic state manipulation.
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type {
  WorkflowState,
  GraphContext,
} from '../../types';

/**
 * Result of an EvalNode execution.
 */
export interface EvalResult {
  /** Whether the evaluation succeeded */
  success: boolean;

  /** Keys that were updated in context */
  updatedKeys: string[];

  /** Error message if failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Configuration for EvalNode.
 */
export interface EvalNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * Pure function that transforms state context.
   * Receives current state, returns partial context to merge.
   *
   * @param state - Current workflow state
   * @returns Partial context to merge with existing context
   *
   * @example
   * ```typescript
   * fn: (state) => ({
   *   currentIndex: state.context.currentIndex + 1,
   *   currentTask: state.context.tasks[state.context.currentIndex + 1],
   * })
   * ```
   */
  fn: (state: WorkflowState<TContext>) => Partial<TContext>;

  /**
   * Key in context to store the eval result metadata.
   * Default: 'lastEvalResult'
   */
  resultKey?: string;
}

/**
 * EvalNode - Pure context transformation.
 *
 * Use this node for:
 * - Loop index management
 * - Setting/computing derived values
 * - Array operations (push, pop, filter, map)
 * - Conditional value assignment
 *
 * Features:
 * - No LLM calls (fast execution)
 * - Type-safe context updates
 * - Tracks updated keys for debugging
 *
 * @example
 * ```typescript
 * // Increment loop counter
 * const incrementNode = nodes.EvalNode({
 *   fn: (state) => ({
 *     currentIndex: state.context.currentIndex + 1,
 *   }),
 *   next: 'PROCESS',
 * });
 *
 * // Collect results
 * const collectNode = nodes.EvalNode({
 *   fn: (state) => ({
 *     results: [...state.context.results, state.context.lastResult],
 *   }),
 *   next: 'NEXT_ITEM',
 * });
 * ```
 */
export class EvalNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, EvalNodeConfig<TContext>> {

  public readonly nodeType = 'eval';

  constructor(config: EvalNodeConfig<TContext>) {
    super({
      ...config,
      resultKey: config.resultKey ?? 'lastEvalResult',
    });
  }

  /**
   * Executes the evaluation function.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const { fn, resultKey } = this.config;

    const startTime = Date.now();

    try {
      // Execute the pure function
      const partialContext = fn(state);
      const duration = Date.now() - startTime;

      // Track which keys were updated
      const updatedKeys = Object.keys(partialContext);

      context.logger.debug(
        `[EvalNode] Updated keys: ${updatedKeys.join(', ') || '(none)'}`
      );

      // Create eval result metadata
      const evalResult: EvalResult = {
        success: true,
        updatedKeys,
        duration,
      };

      // Merge partial context with existing context
      const contextUpdate = {
        ...state.context,
        ...partialContext,
        [resultKey as string]: evalResult,
      } as TContext;

      return {
        stateUpdate: {
          context: contextUpdate,
        },
        metadata: {
          updatedKeys,
          duration,
        },
      };
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;

      throw new NodeExecutionError(
        `Eval function failed: ${err.message}`,
        'eval',
        this.nodeType,
        err,
        { duration }
      );
    }
  }
}

