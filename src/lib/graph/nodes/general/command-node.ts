/**
 * @sys/graph - CommandNode Implementation
 *
 * Runs shell commands via Bun.spawn, supporting output capture,
 * state enrichment, and error handling.
 */

import { spawn } from 'bun';
import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type {
  WorkflowState,
  GraphContext,
  Transition,
} from '../../types';

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
      const runOptions: { cwd?: string; env?: Record<string, string>; timeout?: number } = {};
      if (cwd !== undefined) runOptions.cwd = cwd;
      if (env !== undefined) runOptions.env = env;
      if (timeout !== undefined) runOptions.timeout = timeout;

      const result = await this.runCommand(command, runOptions);
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
        [resultKey!]: commandResult,
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

  /**
   * Runs the command using Bun.spawn.
   */
  private async runCommand(
    command: string,
    options: {
      cwd?: string;
      env?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<Omit<CommandResult, 'duration'>> {
    const { cwd, env, timeout = 300000 } = options;

    // Split command into parts for spawn
    const parts = this.parseCommand(command);

    // Create the subprocess
    const proc = spawn({
      cmd: parts,
      cwd: cwd || process.cwd(),
      env: {
        ...process.env,
        ...env,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    });

    // Wait for completion or timeout
    try {
      const result = await Promise.race([
        proc.exited,
        timeoutPromise,
      ]);

      // Read outputs
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      return {
        exitCode: result as number,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: result === 0,
      };
    } catch (error) {
      // Ensure process is killed on error
      try {
        proc.kill();
      } catch {
        // Ignore kill errors
      }
      throw error;
    }
  }

  /**
   * Parses a command string into an array for spawn.
   * Handles basic shell syntax.
   */
  private parseCommand(command: string): string[] {
    // For complex shell syntax, use sh -c
    if (this.hasShellSyntax(command)) {
      return ['sh', '-c', command];
    }

    // Simple command - split by spaces, respecting quotes
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (const char of command) {
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuote) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Checks if a command contains shell syntax that requires sh -c.
   */
  private hasShellSyntax(command: string): boolean {
    const shellChars = ['|', '>', '<', '&&', '||', ';', '`', '$', '(', ')'];
    return shellChars.some((char) => command.includes(char));
  }
}

/**
 * Factory function to create a CommandNode definition.
 * This is used in atomic.config.ts for declarative node definitions.
 *
 * @example
 * ```typescript
 * nodes.CommandNode({
 *   command: 'gh pr create --fill',
 *   next: 'END'
 * })
 * ```
 */
export function createCommandNode<TContext extends Record<string, unknown>>(
  config: Omit<CommandNodeConfig<TContext>, 'next'> & {
    next: Transition<TContext>;
  }
): CommandNodeConfig<TContext> {
  return config;
}
