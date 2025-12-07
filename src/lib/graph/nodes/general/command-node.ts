/**
 * @sys/graph - CommandNode Implementation
 *
 * Runs shell commands via Bun.spawn, supporting output capture,
 * state enrichment, and error handling.
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
import { executeCommand } from '../utils/command-utils';

/**
 * Result of a shell command execution.
 */
export interface CommandResult {
  /** Exit code of the command */
  exitCode: number;

  /** Standard output */
  stdout: string;

  /** Standard error output */
  stderr: string;

  /** Whether the command succeeded (exitCode === 0) */
  success: boolean;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Configuration for CommandNode.
 */
export interface CommandNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * Shell command to execute.
   * Can include shell syntax (pipes, redirects, etc.)
   */
  command: string;

  /**
   * Working directory for the command.
   * Default: current working directory
   */
  cwd?: string;

  /**
   * Environment variables to set/override.
   */
  env?: Record<string, string>;

  /**
   * Timeout in milliseconds.
   * Default: 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Whether to throw on non-zero exit code.
   * Default: true
   */
  throwOnError?: boolean;

  /**
   * Key in context to store the command result.
   * Default: 'lastCommandResult'
   */
  resultKey?: string;
}

/**
 * CommandNode - Executes shell commands.
 *
 * Features:
 * - Captures stdout and stderr
 * - Stores results in workflow context
 * - Supports timeout and working directory
 * - Handles errors gracefully
 *
 * @example
 * ```typescript
 * const submitNode = new CommandNodeRuntime<MyContext>({
 *   command: 'gh pr create --fill --assignee @me',
 *   next: 'END'
 * });
 * ```
 */
export class CommandNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, CommandNodeConfig<TContext>> {

  public readonly nodeType = 'command';

  constructor(config: CommandNodeConfig<TContext>) {
    super({
      ...config,
      timeout: config.timeout ?? 300000,
      throwOnError: config.throwOnError ?? true,
      resultKey: config.resultKey ?? 'lastCommandResult',
    });
  }

  /**
   * Executes the shell command.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      command,
      cwd,
      env,
      timeout,
      throwOnError,
      resultKey,
    } = this.config;

    context.logger.info(`[CommandNode] Executing: ${command}`);

    const startTime = Date.now();

    try {
      const result = await executeCommand(command, {
        ...(cwd !== undefined && { cwd }),
        ...(env !== undefined && { env }),
        ...(timeout !== undefined && { timeout }),
      });
      const duration = Date.now() - startTime;

      const commandResult: CommandResult = {
        ...result,
        duration,
      };

      context.logger.info(
        `[CommandNode] Completed with exit code ${result.exitCode} in ${duration}ms`
      );

      // Check for errors
      if (throwOnError && !result.success) {
        throw new NodeExecutionError(
          `Command failed with exit code ${result.exitCode}: ${result.stderr}`,
          command,
          this.nodeType,
          undefined,
          { exitCode: result.exitCode, stderr: result.stderr }
        );
      }

      // Store result in context
      const contextUpdate = {
        ...state.context,
        [resultKey as string]: commandResult,
      } as TContext;

      return {
        stateUpdate: {
          context: contextUpdate,
        },
        metadata: {
          exitCode: result.exitCode,
          duration,
        },
      };
    } catch (error) {
      const err = error as Error;

      // If it's already a NodeExecutionError, re-throw
      if (err instanceof NodeExecutionError) {
        throw err;
      }

      const duration = Date.now() - startTime;
      throw new NodeExecutionError(
        `Command execution failed: ${err.message}`,
        command,
        this.nodeType,
        err,
        { command, cwd, duration }
      );
    }
  }

}

