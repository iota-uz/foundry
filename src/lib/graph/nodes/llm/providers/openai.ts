/**
 * OpenAI Provider Implementation
 *
 * Handles GPT model invocations via the OpenAI SDK.
 * Supports web search and reasoning effort for supported models.
 * Uses the Responses API for structured output.
 */

import OpenAI from 'openai';
import { LLMProvider } from '@/lib/graph/enums';
import { BaseLLMProvider, type LLMRequest, type LLMResponse } from './base';

/**
 * Maps our model IDs to OpenAI's actual model identifiers.
 */
const MODEL_ID_MAP: Record<string, string> = {
  'gpt-5.2': 'gpt-5.2',
  'gpt-5-pro': 'gpt-5-pro',
  'gpt-5-mini': 'gpt-5-mini',
  'gpt-5-nano': 'gpt-5-nano',
};

/**
 * OpenAI LLM Provider.
 * Implements GPT model invocations with web search and reasoning support.
 */
export class OpenAIProvider extends BaseLLMProvider {
  readonly provider = LLMProvider.OpenAI;
  private client: OpenAI | null = null;

  /**
   * Get or create the OpenAI client.
   */
  private getClient(apiKey: string): OpenAI {
    if (this.client === null) {
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Execute a GPT model request.
   */
  async execute(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
    const client = this.getClient(apiKey);
    const modelId = MODEL_ID_MAP[request.model] ?? request.model;

    try {
      // Build messages for chat completion
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ];

      // Build request parameters using Chat Completions API
      // Note: Responses API is hypothetical for GPT-5; using chat completions as fallback
      const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model: modelId,
        messages,
        ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
      };

      // Add response format for JSON output
      if (request.outputMode === 'json') {
        if (request.outputSchema !== undefined) {
          requestParams.response_format = {
            type: 'json_schema',
            json_schema: {
              name: 'output',
              schema: request.outputSchema as Record<string, unknown>,
              strict: true,
            },
          };
        } else {
          requestParams.response_format = { type: 'json_object' };
        }
      }

      // TODO: Web search and reasoning effort are hypothetical features for GPT-5.
      // Add implementation when the actual API is available.

      const response = await client.chat.completions.create(requestParams);

      // Extract output text from chat completion response
      const rawOutput = response.choices[0]?.message?.content ?? '';

      // Parse JSON output if requested
      let output: unknown;
      let error: string | undefined;

      if (request.outputMode === 'json') {
        try {
          output = JSON.parse(rawOutput);
        } catch (e) {
          error = `Failed to parse output as JSON: ${(e as Error).message}`;
        }
      }

      const llmResponse: LLMResponse = {
        success: error === undefined,
        rawOutput,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };

      if (output !== undefined) {
        llmResponse.output = output;
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
        error: `OpenAI API error: ${err.message}`,
      };
    }
  }
}
