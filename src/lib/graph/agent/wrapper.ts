/**
 * @sys/graph - Claude Agent SDK Wrapper
 *
 * Abstracts the Claude Agent SDK to provide hydration and state management.
 * The key responsibility is restoring agent memory from persisted conversation history.
 *
 * Supports real-time activity streaming for tool calls, text generation, and errors.
 */

import { query, type Options, type SDKResultMessage, type SDKMessage, type SDKAssistantMessage } from '@anthropic-ai/claude-agent-sdk';
import type { BaseState, IAgentWrapper, AgentStreamingOptions } from '../types';
import { broadcastAgentActivity } from '@/lib/workflow-builder/execution-events';

/**
 * Configuration for the AgentWrapper.
 */
export interface AgentWrapperConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Claude model to use (default: claude-sonnet-4.5) */
  model?: string | undefined;

  /** Additional SDK options */
  sdkOptions?: Partial<Options> | undefined;
}

/**
 * Wrapper around the Claude Agent SDK that handles conversation hydration
 * and state persistence for resumable workflows.
 */
export class AgentWrapper implements IAgentWrapper {
  private config: AgentWrapperConfig;

  constructor(config: AgentWrapperConfig) {
    this.config = {
      model: 'claude-sonnet-4.5',
      ...config,
    };
  }

  /**
   * Runs a single turn of the agent with proper memory hydration.
   *
   * This is the core of the resumability feature:
   * 1. Builds context from conversation history
   * 2. Executes the tool loop via SDK query
   * 3. Returns the new history for persistence
   *
   * @param state - Current workflow state containing conversation history
   * @param userInstruction - The instruction/prompt for this turn
   * @param _tools - SDK-compatible tool definitions (unused in this implementation)
   * @param streaming - Optional streaming options for real-time activity events
   * @returns Response text and updated conversation history
   */
  async runStep<T extends BaseState>(
    state: T,
    userInstruction: string,
    _tools: unknown[],
    streaming?: AgentStreamingOptions
  ): Promise<{
    response: string;
    updatedHistory: unknown[];
    toolsUsed?: string[] | undefined;
  }> {
    // Build prompt with context from previous conversation
    const contextPrompt = this.buildContextFromHistory(state.conversationHistory);
    const fullPrompt = contextPrompt ? `${contextPrompt}\n\n${userInstruction}` : userInstruction;

    // Build SDK options - only set defined values
    const sdkOptions: Options = {};
    if (this.config.model !== undefined) {
      sdkOptions.model = this.config.model;
    }
    if (this.config.sdkOptions) {
      Object.assign(sdkOptions, this.config.sdkOptions);
    }

    // Execute the query
    const queryResult = query({
      prompt: fullPrompt,
      options: sdkOptions,
    });

    // Collect the result and track activity
    let response = '';
    const toolsUsed: string[] = [];

    try {
      for await (const message of queryResult) {
        // Process messages for activity streaming
        if (streaming) {
          this.processMessageForActivity(message, streaming, toolsUsed);
        }

        if (message.type === 'result') {
          const resultMessage = message as SDKResultMessage;
          // Access result from the success subtype
          if ('result' in resultMessage) {
            response = resultMessage.result || '';
          }
        }
      }
    } catch (error) {
      // Emit error activity if streaming is enabled
      if (streaming) {
        broadcastAgentActivity(
          streaming.executionId,
          streaming.nodeId,
          'error',
          {
            errorMessage: error instanceof Error ? error.message : 'Unknown error during agent execution',
            errorCode: error instanceof Error && 'code' in error ? String((error as Error & { code: unknown }).code) : 'AGENT_ERROR',
          }
        );
      }
      throw error;
    }

    // Combine existing history with new messages
    const existingHistory = state.conversationHistory;
    const updatedHistory: unknown[] = [
      ...existingHistory,
      // Add user message
      {
        type: 'user' as const,
        content: userInstruction,
        timestamp: new Date().toISOString(),
      },
      // Add assistant response as simplified stored message
      {
        type: 'assistant' as const,
        content: response,
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      response,
      updatedHistory,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    };
  }

  /**
   * Process SDK message and emit activity events.
   */
  private processMessageForActivity(
    message: SDKMessage,
    streaming: AgentStreamingOptions,
    toolsUsed: string[]
  ): void {
    const { executionId, nodeId, streamTextDeltas = false } = streaming;

    // Handle assistant messages with content blocks
    if (message.type === 'assistant') {
      const assistantMsg = message as SDKAssistantMessage;
      const content = assistantMsg.message?.content;

      if (Array.isArray(content)) {
        for (const block of content) {
          // Handle tool use
          if (block && typeof block === 'object' && 'type' in block) {
            if (block.type === 'tool_use') {
              const toolBlock = block as { type: 'tool_use'; id?: string; name?: string; input?: unknown };
              const toolName = toolBlock.name || 'unknown';
              toolsUsed.push(toolName);

              // Extract file path for file operations
              const input = toolBlock.input as Record<string, unknown> | undefined;
              const filePath = input?.file_path as string | undefined;

              broadcastAgentActivity(executionId, nodeId, 'tool_start', {
                toolName,
                toolInput: input as Record<string, unknown> | undefined,
                toolUseId: toolBlock.id,
                filePath,
              });
            }

            // Handle text blocks (optional streaming)
            if (block.type === 'text' && streamTextDeltas) {
              const textBlock = block as { type: 'text'; text?: string };
              if (textBlock.text) {
                broadcastAgentActivity(executionId, nodeId, 'text_delta', {
                  textDelta: textBlock.text,
                });
              }
            }

            // Handle thinking blocks
            if (block.type === 'thinking') {
              const thinkingBlock = block as { type: 'thinking'; thinking?: string };
              if (thinkingBlock.thinking) {
                broadcastAgentActivity(executionId, nodeId, 'thinking', {
                  thinkingContent: thinkingBlock.thinking,
                });
              }
            }
          }
        }
      }
    }

    // Handle user messages with tool results
    if (message.type === 'user') {
      const userMsg = message as { type: 'user'; message?: { content?: unknown[] } };
      const content = userMsg.message?.content;

      if (Array.isArray(content)) {
        for (const block of content) {
          if (block && typeof block === 'object' && 'type' in block && block.type === 'tool_result') {
            const resultBlock = block as {
              type: 'tool_result';
              tool_use_id?: string;
              content?: unknown;
              is_error?: boolean;
            };

            broadcastAgentActivity(executionId, nodeId, 'tool_result', {
              toolUseId: resultBlock.tool_use_id,
              toolOutput: resultBlock.content,
              success: !resultBlock.is_error,
              errorMessage: resultBlock.is_error ? String(resultBlock.content) : undefined,
            });
          }
        }
      }
    }
  }

  /**
   * Builds context string from conversation history.
   */
  private buildContextFromHistory(history: unknown[]): string {
    if (history.length === 0) {
      return '';
    }

    const contextParts: string[] = [];
    for (const msg of history) {
      // Type guard for message-like objects
      if (
        msg !== null &&
        typeof msg === 'object' &&
        'content' in msg &&
        typeof (msg as { content: unknown }).content === 'string'
      ) {
        const typedMsg = msg as { content: string; type?: string };
        const role = typedMsg.type ?? 'unknown';
        contextParts.push(`[${role}]: ${typedMsg.content}`);
      }
    }

    if (contextParts.length === 0) {
      return '';
    }

    return `Previous conversation:\n${contextParts.join('\n')}\n\nContinue from here:`;
  }
}
