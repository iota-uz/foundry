/**
 * @sys/graph - SlashCommandNode Implementation
 *
 * Runs slash commands (/edit, /test, etc.) with arguments.
 * Provides robust error handling and result propagation to state.
 */

import type { Options, SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from './base';
import type {
  WorkflowState,
  GraphContext,
  Transition,
} from '../types';

/**
 * Supported slash commands.
 */
export type SlashCommand =
  | 'edit'
  | 'test'
  | 'run'
  | 'review'
  | 'explain'
  | 'fix'
  | 'refactor'
  | 'docs'
  | 'commit'
  | string; // Allow custom commands

/**
 * Result of a slash command execution.
 */
export interface SlashCommandResult {
  /** The slash command that was executed */
  command: SlashCommand;

  /** Arguments passed to the command */
  args: string;

  /** Whether the command succeeded */
  success: boolean;

  /** Output/result from the command */
  output: string;

  /** Error details if command failed */
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };

  /** Execution duration in milliseconds */
  duration: number;

  /** Files affected by the command (for /edit, /fix, etc.) */
  filesAffected?: string[];
}

/**
 * Configuration for SlashCommandNode.
 */
export interface SlashCommandNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * The slash command to run (without the leading /).
   * Examples: 'edit', 'test', 'run', 'review'
   */
  command: SlashCommand;

  /**
   * Arguments/instructions for the command.
   * For /edit: describe what changes to make
   * For /test: specify test file or pattern
   */
  args: string;

  /**
   * Working directory for the command.
   * Default: current working directory
   */
  cwd?: string;

  /**
   * Timeout in milliseconds.
   * Default: 600000 (10 minutes) - commands can take a while
   */
  timeout?: number;

  /**
   * Whether to throw on command failure.
   * Default: true
   */
  throwOnError?: boolean;

  /**
   * Key in context to store the command result.
   * Default: 'lastSlashCommandResult'
   */
  resultKey?: string;

  /**
   * Claude model to use.
   */
  model?: string;

  /**
   * Additional context/instructions to include.
   */
  additionalContext?: string;
}

/**
 * Options for running a slash command.
 */
interface RunSlashCommandOptions {
  command: SlashCommand;
  args: string;
  cwd?: string;
  timeout?: number;
  model?: string;
  additionalContext?: string;
  context: GraphContext;
}

/**
 * Result from running a slash command.
 */
interface RunSlashCommandResult {
  success: boolean;
  output: string;
  error?: { message: string; code?: string; details?: Record<string, unknown> };
  filesAffected?: string[];
}

/**
 * SlashCommandNode - Executes slash commands.
 *
 * Features:
 * - Supports common slash commands (/edit, /test, /run, etc.)
 * - Captures output and affected files
 * - Stores results in workflow context
 * - Provides detailed error information
 *
 * @example
 * ```typescript
 * const editNode = new SlashCommandNodeRuntime<MyContext>({
 *   command: 'edit',
 *   args: 'Add error handling to the processData function in src/utils.ts',
 *   next: 'TEST'
 * });
 *
 * const testNode = new SlashCommandNodeRuntime<MyContext>({
 *   command: 'test',
 *   args: 'src/utils.test.ts',
 *   next: (state) => state.context.lastSlashCommandResult?.success ? 'SUBMIT' : 'FIX'
 * });
 * ```
 */
export class SlashCommandNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, SlashCommandNodeConfig<TContext>> {

  public readonly nodeType = 'slash-command';

  constructor(config: SlashCommandNodeConfig<TContext>) {
    super({
      ...config,
      timeout: config.timeout ?? 600000,
      throwOnError: config.throwOnError ?? true,
      resultKey: config.resultKey ?? 'lastSlashCommandResult',
    });
  }

  /**
   * Executes the slash command.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      command,
      args,
      cwd,
      timeout,
      throwOnError,
      resultKey,
      model,
      additionalContext,
    } = this.config;

    const fullCommand = `/${command} ${args}`;
    context.logger.info(`[SlashCommandNode] Executing: ${fullCommand}`);

    const startTime = Date.now();

    try {
      const runOptions: RunSlashCommandOptions = {
        command,
        args,
        context,
      };
      if (cwd !== undefined) runOptions.cwd = cwd;
      if (timeout !== undefined) runOptions.timeout = timeout;
      if (model !== undefined) runOptions.model = model;
      if (additionalContext !== undefined) runOptions.additionalContext = additionalContext;

      const result = await this.runSlashCommandCommand(runOptions);

      const duration = Date.now() - startTime;

      const claudeCodeResult: SlashCommandResult = {
        command,
        args,
        success: result.success,
        output: result.output,
        duration,
      };
      if (result.error !== undefined) claudeCodeResult.error = result.error;
      if (result.filesAffected !== undefined) claudeCodeResult.filesAffected = result.filesAffected;

      context.logger.info(
        `[SlashCommandNode] ${result.success ? 'Succeeded' : 'Failed'} in ${duration}ms`
      );

      // Check for errors
      if (throwOnError && !result.success) {
        throw new NodeExecutionError(
          `Slash command failed: ${result.error?.message || 'Unknown error'}`,
          fullCommand,
          this.nodeType,
          undefined,
          { command, args, error: result.error }
        );
      }

      // Store result in context
      const contextUpdate = {
        ...state.context,
        [resultKey!]: claudeCodeResult,
      } as TContext;

      return {
        stateUpdate: {
          context: contextUpdate,
        },
        metadata: {
          command,
          success: result.success,
          duration,
          filesAffected: result.filesAffected,
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
        `Slash command execution failed: ${err.message}`,
        fullCommand,
        this.nodeType,
        err,
        { command, args, duration }
      );
    }
  }

  /**
   * Runs the Slash slash command using the SDK.
   */
  private async runSlashCommandCommand(options: RunSlashCommandOptions): Promise<RunSlashCommandResult> {
    const { command, args, cwd, timeout = 600000, model, additionalContext } = options;

    // Build the prompt as a slash command
    const prompt = this.buildCommandPrompt(command, args, additionalContext);

    // SDK options
    const sdkOptions: Options = {
      cwd: cwd || process.cwd(),
      maxTurns: 50, // Allow more turns for complex operations
    };

    if (model) {
      sdkOptions.model = model;
    }

    try {
      // Execute the query with timeout
      const queryPromise = this.executeQuery(prompt, sdkOptions);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);

      return result;
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        output: '',
        error: {
          message: err.message,
          code: 'EXECUTION_ERROR',
        },
      };
    }
  }

  /**
   * Executes the SDK query and collects results.
   */
  private async executeQuery(
    prompt: string,
    sdkOptions: Options
  ): Promise<RunSlashCommandResult> {
    const queryResult = query({
      prompt,
      options: sdkOptions,
    });

    let output = '';
    let success = true;
    let error: { message: string; code?: string; details?: Record<string, unknown> } | undefined;
    const filesAffected: string[] = [];

    for await (const message of queryResult) {
      // Collect result message
      if (message.type === 'result') {
        const resultMessage = message as SDKResultMessage;
        // Access result from the success subtype
        if ('result' in resultMessage) {
          output = resultMessage.result || '';
        }

        // Check for errors in the result
        if ('error' in resultMessage && resultMessage.error) {
          success = false;
          error = {
            message: String(resultMessage.error),
            code: 'RESULT_ERROR',
          };
        }
      }

      // Track file operations
      if (this.isFileOperationMessage(message)) {
        const filePath = this.extractFilePath(message);
        if (filePath && !filesAffected.includes(filePath)) {
          filesAffected.push(filePath);
        }
      }

      // Check for error messages
      if (message.type === 'assistant' && 'error' in message && message.error) {
        success = false;
        error = {
          message: String(message.error),
          code: 'ASSISTANT_ERROR',
        };
      }
    }

    const result: RunSlashCommandResult = {
      success,
      output,
    };
    if (error !== undefined) result.error = error;
    if (filesAffected.length > 0) result.filesAffected = filesAffected;

    return result;
  }

  /**
   * Builds the command prompt for the SDK.
   */
  private buildCommandPrompt(
    command: SlashCommandCommand,
    args: string,
    additionalContext?: string
  ): string {
    const commandPrompt = `/${command} ${args}`;

    if (additionalContext) {
      return `${additionalContext}\n\n${commandPrompt}`;
    }

    return commandPrompt;
  }

  /**
   * Checks if a message represents a file operation.
   */
  private isFileOperationMessage(message: SDKMessage): boolean {
    if ('tool_name' in message) {
      const toolName = message.tool_name as string;
      return ['Edit', 'Write', 'Read', 'MultiEdit'].includes(toolName);
    }
    return false;
  }

  /**
   * Extracts file path from a message if present.
   */
  private extractFilePath(message: SDKMessage): string | undefined {
    if ('content' in message) {
      const content = message.content;
      if (typeof content === 'string') {
        // Try to extract file path from common patterns
        const pathMatch = content.match(/(?:file:|path:)\s*([^\s,]+)/i);
        if (pathMatch) {
          return pathMatch[1];
        }
      }
    }
    return undefined;
  }
}

/**
 * Factory function to create a SlashCommandNode definition.
 * This is used in atomic.config.ts for declarative node definitions.
 *
 * @example
 * ```typescript
 * nodes.SlashCommandNode({
 *   command: 'edit',
 *   args: 'Add validation to the user input',
 *   next: 'TEST'
 * })
 * ```
 */
export function createSlashCommandNode<TContext extends Record<string, unknown>>(
  config: Omit<SlashCommandNodeConfig<TContext>, 'next'> & {
    next: Transition<TContext>;
  }
): SlashCommandNodeConfig<TContext> {
  return config;
}
