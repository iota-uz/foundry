/**
 * @sys/graph - AgentNode Implementation
 *
 * Runs Anthropic Claude agent flows with role, system prompt, toolset,
 * and optional dynamic transitions. Wraps the Claude Agent SDK for
 * conversation management and tool execution.
 */

import { z } from 'zod';
import type { Options, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  isInlineToolDefinition,
  NodeExecutionError,
} from '../base';
import type {
  WorkflowState,
  GraphContext,
  Transition,
  ToolReference,
  InlineTool,
} from '../../types';

/**
 * Configuration for AgentNode.
 */
export interface AgentNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /** Role identifier for logging and debugging */
  role: string;

  /** System prompt for the AI agent */
  system: string;

  /**
   * Tools available to the agent.
   * Can be stdlib tool names (strings) or inline tool definitions.
   */
  tools?: ToolReference[];

  /**
   * Maximum number of turns/iterations for the agent loop.
   * Default: 10
   */
  maxTurns?: number;

  /**
   * Claude model to use.
   * Default: uses the SDK default
   */
  model?: string;
}

/**
 * A stored message in the conversation history.
 * Simplified representation for serialization.
 */
export interface StoredMessage {
  type: 'user' | 'assistant' | 'result' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * AgentNode - Executes AI agent flows.
 *
 * Features:
 * - Manages conversation history persistence
 * - Supports both stdlib and custom inline tools
 * - Handles tool execution via Claude Agent SDK
 * - Provides structured error handling
 *
 * @example
 * ```typescript
 * const planNode = new AgentNodeRuntime<MyContext>({
 *   role: 'architect',
 *   system: 'You are a Tech Lead. Output a JSON plan.',
 *   tools: ['list_files', 'read_file'],
 *   next: 'IMPLEMENT'
 * });
 * ```
 */
export class AgentNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, AgentNodeConfig<TContext>> {

  public readonly nodeType = 'agent';

  constructor(config: AgentNodeConfig<TContext>) {
    super(config);
  }

  /**
   * Executes the agent with the given state and context.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const { role, system, tools = [], maxTurns = 10, model } = this.config;

    context.logger.info(`[AgentNode] Running agent with role: ${role}`);

    // Convert inline tools to SDK format
    const preparedTools = this.prepareTools(tools);
    const toolNames = preparedTools.map((t) => t.name);

    // Build the prompt from system prompt and any context
    const prompt = this.buildPrompt(system, state);

    try {
      // Execute the agent query
      const result = await this.runAgentQuery(prompt, {
        tools: preparedTools,
        maxTurns,
        model,
        context,
      });

      // Extract and store conversation history
      const newMessage: StoredMessage = {
        type: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        metadata: {
          role,
          toolsUsed: result.toolsUsed,
        },
      };

      // Create updated history
      const existingHistory = (state.conversationHistory || []) as StoredMessage[];
      const updatedHistory = [...existingHistory, newMessage];

      return {
        stateUpdate: {
          conversationHistory: updatedHistory as unknown as WorkflowState<TContext>['conversationHistory'],
        },
        metadata: {
          toolsUsed: result.toolsUsed,
          response: result.response,
        },
      };
    } catch (error) {
      const err = error as Error;
      throw new NodeExecutionError(
        `Agent execution failed: ${err.message}`,
        role,
        this.nodeType,
        err,
        { system, toolNames }
      );
    }
  }

  /**
   * Prepares tools for the SDK, converting inline definitions.
   */
  private prepareTools(tools: ToolReference[]): PreparedTool[] {
    const preparedTools: PreparedTool[] = [];

    for (const tool of tools) {
      if (isInlineToolDefinition(tool)) {
        // Convert inline tool definition to SDK format
        const inlineTool = tool as InlineTool<unknown>;
        preparedTools.push({
          name: inlineTool.name,
          description: inlineTool.description || inlineTool.name,
          schema: inlineTool.schema,
          execute: inlineTool.execute,
        });
      } else {
        // String reference - will be resolved by stdlib tool registry
        preparedTools.push({
          name: tool,
          description: `Stdlib tool: ${tool}`,
          schema: z.object({}),
          execute: async () => {
            // Stdlib tools are handled by the SDK's built-in tool set
            return { message: `Stdlib tool ${tool} - handled by SDK` };
          },
          isStdlib: true,
        });
      }
    }

    return preparedTools;
  }

  /**
   * Builds the prompt from system prompt and state context.
   */
  private buildPrompt(system: string, state: WorkflowState<TContext>): string {
    // Include relevant context in the prompt
    const contextStr = state.context
      ? `\n\nCurrent context:\n${JSON.stringify(state.context, null, 2)}`
      : '';

    return `${system}${contextStr}`;
  }

  /**
   * Runs the agent query using the Claude Agent SDK.
   */
  private async runAgentQuery(
    prompt: string,
    options: {
      tools: PreparedTool[];
      maxTurns: number;
      model?: string | undefined;
      context: GraphContext;
    }
  ): Promise<{ response: string; toolsUsed: string[] }> {
    const { tools, maxTurns, model } = options;

    // Build SDK options
    const sdkOptions: Options = {
      maxTurns,
      systemPrompt: prompt,
    };

    if (model) {
      sdkOptions.model = model;
    }

    // Filter out stdlib tools (those are handled by the SDK's built-in tools)
    const stdlibToolNames = tools.filter((t) => t.isStdlib).map((t) => t.name);

    // If we have stdlib tools, add them to allowed tools
    if (stdlibToolNames.length > 0) {
      sdkOptions.allowedTools = stdlibToolNames;
    }

    // Execute the query
    const queryResult = query({
      prompt,
      options: sdkOptions,
    });

    const toolsUsed: string[] = [];
    let response = '';

    // Collect messages from the query
    for await (const message of queryResult) {
      if (message.type === 'result') {
        const resultMessage = message as SDKResultMessage;
        // Access result from the success subtype
        if ('result' in resultMessage) {
          response = resultMessage.result || '';
        }
      }

      // Track tool usage
      if ('tool_name' in message && message.tool_name) {
        toolsUsed.push(message.tool_name as string);
      }
    }

    return { response, toolsUsed };
  }
}

/**
 * Internal representation of a prepared tool.
 */
interface PreparedTool {
  name: string;
  description: string;
  schema: z.ZodType<unknown>;
  execute: (args: unknown) => Promise<unknown>;
  isStdlib?: boolean;
}

/**
 * Factory function to create an AgentNode definition.
 * This is used in atomic.config.ts for declarative node definitions.
 *
 * @example
 * ```typescript
 * nodes.AgentNode({
 *   role: 'architect',
 *   system: 'You are a Tech Lead.',
 *   tools: ['list_files', 'read_file'],
 *   next: 'IMPLEMENT'
 * })
 * ```
 */
export function createAgentNode<TContext extends Record<string, unknown>>(
  config: Omit<AgentNodeConfig<TContext>, 'next'> & {
    next: Transition<TContext>;
  }
): AgentNodeConfig<TContext> {
  return config;
}
