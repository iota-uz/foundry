/**
 * @sys/graph - Claude Agent SDK Wrapper
 *
 * Abstracts the Claude Agent SDK to provide hydration and state management.
 * The key responsibility is restoring agent memory from persisted conversation history.
 */

import { Agent, type AgentOptions, type Message } from '@anthropic-ai/claude-agent-sdk';
import type { BaseState, IAgentWrapper } from '../types';

/**
 * Configuration for the AgentWrapper.
 */
export interface AgentWrapperConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Claude model to use (default: claude-3-5-sonnet-20241022) */
  model?: string | undefined;

  /** Additional SDK options */
  sdkOptions?: Partial<AgentOptions> | undefined;
}

/**
 * Wrapper around the Claude Agent SDK that handles conversation hydration
 * and state persistence for resumable workflows.
 */
export class AgentWrapper implements IAgentWrapper {
  private config: AgentWrapperConfig;

  constructor(config: AgentWrapperConfig) {
    this.config = {
      model: 'claude-3-5-sonnet-20241022',
      ...config,
    };
  }

  /**
   * Runs a single turn of the agent with proper memory hydration.
   *
   * This is the core of the resumability feature:
   * 1. Creates a fresh Agent instance
   * 2. Pre-loads it with conversation history from state
   * 3. Executes the tool loop via SDK
   * 4. Returns the new history for persistence
   *
   * PERFORMANCE NOTE: A fresh Agent instance is created on each runStep call
   * to ensure clean state and proper hydration from persisted conversation
   * history. While this has some overhead, it ensures predictable behavior
   * and correct resumability semantics. For high-frequency workflows,
   * consider batching operations within a single step.
   *
   * @param state - Current workflow state containing conversation history
   * @param userInstruction - The instruction/prompt for this turn
   * @param tools - SDK-compatible tool definitions
   * @returns Response text and updated conversation history
   */
  async runStep<T extends BaseState>(
    state: T,
    userInstruction: string,
    tools: unknown[]
  ): Promise<{
    response: string;
    updatedHistory: Message[];
  }> {
    // HYDRATION: Create a fresh agent instance pre-loaded with past context
    const agent = new Agent({
      apiKey: this.config.apiKey,
      model: this.config.model,
      tools: tools,
      messages: state.conversationHistory || [],
      ...this.config.sdkOptions,
    });

    // EXECUTION: Delegate to the official SDK
    // The SDK handles the entire tool use loop internally:
    // - AI thinks and decides to use tools
    // - Tools execute
    // - Results are fed back to AI
    // - Process repeats until AI responds with text
    const result = await agent.run(userInstruction);

    // EXTRACTION: Get the full conversation history to save to disk
    // This includes the user instruction, tool calls, tool results, and AI responses
    return {
      response: result.text,
      updatedHistory: agent.messages,
    };
  }
}
