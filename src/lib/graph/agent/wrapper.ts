/**
 * @sys/graph - Claude Agent SDK Wrapper
 *
 * Abstracts the Claude Agent SDK to provide hydration and state management.
 * The key responsibility is restoring agent memory from persisted conversation history.
 */

import { query, type Options, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { BaseState, IAgentWrapper } from '../types';

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
   * @returns Response text and updated conversation history
   */
  async runStep<T extends BaseState>(
    state: T,
    userInstruction: string,
    _tools: unknown[]
  ): Promise<{
    response: string;
    updatedHistory: unknown[];
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

    // Collect the result
    let response = '';

    for await (const message of queryResult) {
      if (message.type === 'result') {
        const resultMessage = message as SDKResultMessage;
        // Access result from the success subtype
        if ('result' in resultMessage) {
          response = resultMessage.result || '';
        }
      }
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
    };
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
