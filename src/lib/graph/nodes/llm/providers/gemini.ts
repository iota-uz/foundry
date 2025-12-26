/**
 * Gemini Provider Implementation
 *
 * Handles Gemini model invocations via the Google Generative AI SDK.
 * Supports thinking mode and web search for supported models.
 */

import { GoogleGenerativeAI, type GenerationConfig, type GenerateContentRequest } from '@google/generative-ai';
import { LLMProvider } from '@/lib/graph/enums';
import { BaseLLMProvider, type LLMRequest, type LLMResponse } from './base';

/**
 * Maps our model IDs to Gemini's actual model identifiers.
 */
const MODEL_ID_MAP: Record<string, string> = {
  'gemini-3-pro': 'gemini-3.0-pro',
  'gemini-3-flash-preview': 'gemini-3.0-flash-preview',
};

/**
 * Gemini LLM Provider.
 * Implements Gemini model invocations with thinking and grounding support.
 */
export class GeminiProvider extends BaseLLMProvider {
  readonly provider = LLMProvider.Gemini;
  private client: GoogleGenerativeAI | null = null;

  /**
   * Get or create the Google Generative AI client.
   */
  private getClient(apiKey: string): GoogleGenerativeAI {
    if (this.client === null) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
    return this.client;
  }

  /**
   * Execute a Gemini model request.
   */
  async execute(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
    const client = this.getClient(apiKey);
    const modelId = MODEL_ID_MAP[request.model] ?? request.model;

    try {
      // Get the generative model
      const model = client.getGenerativeModel({
        model: modelId,
        systemInstruction: request.systemPrompt,
      });

      // Build generation config
      const generationConfig: GenerationConfig = {
        ...(request.maxTokens !== undefined && { maxOutputTokens: request.maxTokens }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
      };

      // Add JSON response type if requested
      if (request.outputMode === 'json') {
        generationConfig.responseMimeType = 'application/json';
        // Note: responseSchema requires a specific Schema type from the SDK
        // For now, we'll rely on post-validation instead
      }

      // Build the content request
      const contentRequest: GenerateContentRequest = {
        contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
        generationConfig,
      };

      // TODO: Web search (grounding) and thinking config are advanced features
      // that may require specific API versions. Add when available.

      // Generate content
      const result = await model.generateContent(contentRequest);

      const response = result.response;
      const rawOutput = response.text();

      // Extract thinking if available (advanced feature)
      let thinking: string | undefined;
      const candidate = response.candidates?.[0];
      if (candidate !== undefined && candidate.content?.parts !== undefined) {
        for (const part of candidate.content.parts) {
          // Thinking parts are an advanced feature
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyPart = part as any;
          if ('thought' in anyPart && typeof anyPart.thought === 'string') {
            thinking = anyPart.thought;
          }
        }
      }

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

      // Get usage metadata
      const usageMetadata = response.usageMetadata;

      const llmResponse: LLMResponse = {
        success: error === undefined,
        rawOutput,
        usage: {
          inputTokens: usageMetadata?.promptTokenCount ?? 0,
          outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
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
        error: `Gemini API error: ${err.message}`,
      };
    }
  }
}
