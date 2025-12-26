/**
 * Anthropic Provider Implementation
 *
 * Handles Claude model invocations via the Anthropic SDK.
 * Supports extended thinking (reasoning) for Opus and Sonnet models.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { LLMProvider } from '@/lib/graph/enums';
import { BaseLLMProvider, type LLMRequest, type LLMResponse } from './base';

/**
 * Maps reasoning effort to thinking budget tokens.
 * Higher budgets allow for more complex reasoning chains.
 */
const THINKING_BUDGET_MAP: Record<'low' | 'medium' | 'high', number> = {
  low: 2048,
  medium: 8192,
  high: 32768,
};

/**
 * Maps our model IDs to Anthropic's actual model identifiers.
 */
const MODEL_ID_MAP: Record<string, string> = {
  'claude-opus-4-5': 'claude-opus-4-5-20250514',
  'claude-sonnet-4-5': 'claude-sonnet-4-5-20250514',
  'claude-haiku-4-5': 'claude-haiku-4-5-20250514',
};

/**
 * Models that support extended thinking.
 */
const THINKING_SUPPORTED_MODELS = new Set(['claude-opus-4-5', 'claude-sonnet-4-5']);

/**
 * Anthropic LLM Provider.
 * Implements Claude model invocations with extended thinking support.
 */
export class AnthropicProvider extends BaseLLMProvider {
  readonly provider = LLMProvider.Anthropic;
  private client: Anthropic | null = null;

  /**
   * Get or create the Anthropic client.
   */
  private getClient(apiKey: string): Anthropic {
    if (this.client === null) {
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Execute a Claude model request.
   */
  async execute(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
    const client = this.getClient(apiKey);
    const modelId = MODEL_ID_MAP[request.model] ?? request.model;

    // Build messages
    const messages: MessageParam[] = [
      { role: 'user', content: request.userPrompt },
    ];

    // Build request parameters
    const requestParams: Anthropic.MessageCreateParams = {
      model: modelId,
      max_tokens: request.maxTokens ?? 4096,
      system: request.systemPrompt,
      messages,
    };

    // Add temperature only if not using extended thinking
    // Extended thinking requires temperature to be unset or 1
    const useThinking =
      request.reasoningEffort !== undefined &&
      THINKING_SUPPORTED_MODELS.has(request.model);

    if (!useThinking && request.temperature !== undefined) {
      requestParams.temperature = request.temperature;
    }

    // Configure extended thinking if supported and requested
    // Note: Extended thinking requires specific API version support
    if (useThinking && request.reasoningEffort !== undefined) {
      const budgetTokens = THINKING_BUDGET_MAP[request.reasoningEffort];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (requestParams as any).thinking = {
        type: 'enabled',
        budget_tokens: budgetTokens,
      };
    }

    try {
      const response = await client.messages.create(requestParams);

      // Extract response content
      let rawOutput = '';
      let thinking: string | undefined;

      for (const block of response.content) {
        if (block.type === 'text') {
          rawOutput += block.text;
        }
        // Extended thinking blocks have type 'thinking' when available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyBlock = block as any;
        if (anyBlock.type === 'thinking' && typeof anyBlock.thinking === 'string') {
          thinking = anyBlock.thinking;
        }
      }

      // Parse JSON output if requested
      let output: unknown;
      let error: string | undefined;

      if (request.outputMode === 'json') {
        try {
          // Try to extract JSON from markdown code blocks or raw JSON
          const jsonMatch =
            rawOutput.match(/```json\n?([\s\S]*?)\n?```/) ??
            rawOutput.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch !== null ? (jsonMatch[1] ?? jsonMatch[0]) : rawOutput;
          output = JSON.parse(jsonStr);
        } catch (e) {
          error = `Failed to parse output as JSON: ${(e as Error).message}`;
        }
      }

      const llmResponse: LLMResponse = {
        success: error === undefined,
        rawOutput,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };

      if (output !== undefined) {
        llmResponse.output = output;
      }
      if (thinking !== undefined) {
        llmResponse.thinking = thinking;
      }
      if (error !== undefined) {
        llmResponse.error = error;
      }

      return llmResponse;
    } catch (e) {
      const err = e as Error;
      return {
        success: false,
        rawOutput: '',
        usage: { inputTokens: 0, outputTokens: 0 },
        error: `Anthropic API error: ${err.message}`,
      };
    }
  }
}
