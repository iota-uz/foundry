/**
 * Base LLM Provider Abstraction
 *
 * Defines the common interface for all LLM providers.
 * Each provider implements this interface to handle model-specific APIs.
 */

import type { LLMModelId, LLMProvider } from '@/lib/graph/enums';

/**
 * Request payload for LLM invocation.
 */
export interface LLMRequest {
  /** Model ID to use */
  model: LLMModelId;
  /** System prompt (instructions) */
  systemPrompt: string;
  /** User prompt (the actual request) */
  userPrompt: string;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Output mode: text or json */
  outputMode: 'text' | 'json';
  /** JSON schema for structured output (when outputMode is 'json') */
  outputSchema?: object;
  /** Enable web search (provider-specific) */
  enableWebSearch?: boolean;
  /** Reasoning effort level (provider-specific) */
  reasoningEffort?: 'low' | 'medium' | 'high';
}

/**
 * Response from LLM invocation.
 */
export interface LLMResponse {
  /** Whether the invocation succeeded */
  success: boolean;
  /** Parsed/structured output (if schema provided and valid) */
  output?: unknown | undefined;
  /** Raw text response from the model */
  rawOutput: string;
  /** Thinking/reasoning output (if extended thinking enabled) */
  thinking?: string | undefined;
  /** Token usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Error message if failed */
  error?: string | undefined;
}

/**
 * Abstract base class for LLM providers.
 * Each provider (Anthropic, OpenAI, Gemini) extends this class.
 */
export abstract class BaseLLMProvider {
  /** Provider identifier */
  abstract readonly provider: LLMProvider;

  /**
   * Execute an LLM request.
   * @param request The LLM request parameters
   * @param apiKey The API key for authentication
   * @returns Promise resolving to the LLM response
   */
  abstract execute(request: LLMRequest, apiKey: string): Promise<LLMResponse>;
}
