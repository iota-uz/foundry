/**
 * LLM types for Claude SDK integration
 */

import type { z } from 'zod';

/**
 * Claude model identifiers
 */
export type ClaudeModel = 'sonnet' | 'opus' | 'haiku';

/**
 * Model configuration mapping
 */
export interface ModelConfig {
  sonnet: string;
  opus: string;
  haiku: string;
}

/**
 * Default model names
 */
export const MODEL_NAMES: ModelConfig = {
  sonnet: 'claude-sonnet-4.5',
  opus: 'claude-opus-4.5',
  haiku: 'claude-haiku-4.5',
};

/**
 * Parameters for LLM call
 */
export interface LLMCallParams {
  model: ClaudeModel;
  systemPrompt: string;
  userPrompt: string;
  outputSchema?: z.ZodSchema | undefined;
  maxTokens: number;
  temperature?: number | undefined;
  topP?: number | undefined;
  constitution?: Record<string, unknown> | undefined; // Constitution object if available
}

/**
 * LLM call response
 */
export interface LLMResponse {
  content: string;
  structured?: unknown; // Parsed structured output if schema provided
  tokensUsed: number;
  model: string;
  finishReason: 'end_turn' | 'max_tokens' | 'stop_sequence';
}

/**
 * Streaming event types
 */
export type StreamEventType = 'content' | 'structured' | 'error' | 'done';

/**
 * Streaming event
 */
export interface StreamEvent {
  type: StreamEventType;
  data: unknown;
}


/**
 * LLM error types
 */
export type LLMErrorType =
  | 'api_error'
  | 'timeout'
  | 'rate_limit'
  | 'invalid_request'
  | 'authentication'
  | 'structured_output_failed';

/**
 * LLM error
 */
export class LLMError extends Error {
  type: LLMErrorType;
  statusCode?: number | undefined;
  retryable: boolean;

  constructor(type: LLMErrorType, message: string, retryable = false, statusCode?: number | undefined) {
    super(message);
    this.name = 'LLMError';
    this.type = type;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}
