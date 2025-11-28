/**
 * LLMService - Claude SDK integration for LLM calls
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type {
  LLMCallParams,
  LLMResponse,
  StreamEvent,
} from '@/types/ai';
import { MODEL_NAMES, LLMError as LLMErrorClass } from '@/types/ai';

/**
 * LLMService handles all interactions with Claude API
 */
export class LLMService {
  private client: Anthropic;
  private apiKey: string;
  private defaultMaxTokens = 2000;
  private defaultTemperature = 1.0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required. Set it as environment variable or pass to constructor.'
      );
    }
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  /**
   * Make a single LLM call with optional structured output
   */
  async call(params: LLMCallParams): Promise<LLMResponse> {
    const {
      model,
      systemPrompt,
      userPrompt,
      outputSchema,
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      topP,
      constitution,
    } = params;

    // Build final system prompt with constitution if provided
    const finalSystemPrompt = this.buildSystemPrompt(systemPrompt, constitution);

    // Get full model name
    const modelName = MODEL_NAMES[model];

    try {
      // If structured output is required, use the extended format
      if (outputSchema) {
        return await this.callWithStructuredOutput(
          modelName,
          finalSystemPrompt,
          userPrompt,
          outputSchema,
          maxTokens,
          temperature,
          topP
        );
      }

      // Regular text completion
      const response = await this.client.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        temperature,
        ...(topP !== undefined && { top_p: topP }),
        system: finalSystemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Extract text content
      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block: unknown) => block.text)
        .join('\n');

      return {
        content: textContent,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        model: response.model,
        finishReason: this.mapStopReason(response.stop_reason),
      };
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  /**
   * Call with structured output using JSON schema
   */
  private async callWithStructuredOutput(
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
    _outputSchema: unknown,
    maxTokens: number,
    temperature: number,
    topP?: number
  ): Promise<LLMResponse> {
    try {
      // Convert Zod schema to JSON schema
      const jsonSchema = this.zodToJsonSchema(_outputSchema);

      // Add structured output instruction to system prompt
      const structuredSystemPrompt = `${systemPrompt}

You must respond with valid JSON matching this schema:
${JSON.stringify(jsonSchema, null, 2)}`;

      const response = await this.client.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        temperature,
        ...(topP !== undefined && { top_p: topP }),
        system: structuredSystemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Extract text content
      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block: unknown) => block.text)
        .join('\n');

      // Parse structured output
      let structured: unknown;
      try {
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = textContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        const jsonText = (jsonMatch && jsonMatch[1]) || textContent;
        structured = JSON.parse(jsonText);

        // Validate with Zod schema
        structured = _outputSchema.parse(structured);
      } catch (parseError: unknown) {
        throw new LLMErrorClass(
          'structured_output_failed',
          `Failed to parse structured output: ${parseError.message}`,
          false
        );
      }

      return {
        content: textContent,
        structured,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        model: response.model,
        finishReason: this.mapStopReason(response.stop_reason),
      };
    } catch (error: unknown) {
      if (error instanceof LLMErrorClass) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Stream LLM response for long outputs
   */
  async *stream(params: LLMCallParams): AsyncIterable<StreamEvent> {
    const {
      model,
      systemPrompt,
      userPrompt,
      outputSchema,
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      topP,
      constitution,
    } = params;

    const finalSystemPrompt = this.buildSystemPrompt(systemPrompt, constitution);
    const modelName = MODEL_NAMES[model];

    try {
      const stream = await this.client.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        temperature,
        ...(topP !== undefined && { top_p: topP }),
        system: finalSystemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stream: true,
      });

      let fullContent = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullContent += text;
            yield {
              type: 'content',
              data: text,
            };
          }
        } else if (event.type === 'message_stop') {
          // If structured output is expected, parse at the end
          if (outputSchema) {
            try {
              const jsonMatch = fullContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
              const jsonText = (jsonMatch && jsonMatch[1]) || fullContent;
              const structured = outputSchema.parse(JSON.parse(jsonText));
              yield {
                type: 'structured',
                data: structured,
              };
            } catch (parseError: unknown) {
              yield {
                type: 'error',
                data: `Failed to parse structured output: ${parseError.message}`,
              };
            }
          }
          yield {
            type: 'done',
            data: null,
          };
        }
      }
    } catch (error: unknown) {
      yield {
        type: 'error',
        data: this.handleError(error).message,
      };
    }
  }

  /**
   * Build final system prompt with constitution
   */
  private buildSystemPrompt(basePrompt: string, constitution?: unknown): string {
    if (!constitution) {
      return basePrompt;
    }

    const constitutionText = this.formatConstitution(constitution);
    return `${basePrompt}

## Project Constitution

${constitutionText}

You MUST follow all constitution rules.`;
  }

  /**
   * Format constitution object as readable text
   */
  private formatConstitution(constitution: unknown): string {
    const parts: string[] = [];

    if (constitution.principles?.length) {
      parts.push('### Principles');
      constitution.principles.forEach((p: string) => parts.push(`- ${p}`));
      parts.push('');
    }

    if (constitution.coding) {
      parts.push('### Coding Standards');
      if (constitution.coding.naming) {
        parts.push('**Naming:**');
        Object.entries(constitution.coding.naming).forEach(([key, value]) => {
          parts.push(`- ${key}: ${value}`);
        });
      }
      if (constitution.coding.style) {
        parts.push('**Style:**');
        Object.entries(constitution.coding.style).forEach(([key, value]) => {
          parts.push(`- ${key}: ${value}`);
        });
      }
      parts.push('');
    }

    if (constitution.security) {
      parts.push('### Security Requirements');
      Object.entries(constitution.security).forEach(([key, value]) => {
        parts.push(`- ${key}: ${value}`);
      });
      parts.push('');
    }

    if (constitution.ux) {
      parts.push('### UX Patterns');
      Object.entries(constitution.ux).forEach(([key, value]) => {
        parts.push(`- ${key}: ${value}`);
      });
      parts.push('');
    }

    if (constitution.constraints) {
      parts.push('### Constraints');
      if (constitution.constraints.allowed_libraries?.length) {
        parts.push(`**Allowed libraries:** ${constitution.constraints.allowed_libraries.join(', ')}`);
      }
      if (constitution.constraints.forbidden_libraries?.length) {
        parts.push(
          `**Forbidden libraries:** ${constitution.constraints.forbidden_libraries.join(', ')}`
        );
      }
      Object.entries(constitution.constraints)
        .filter(([key]) => !['allowed_libraries', 'forbidden_libraries'].includes(key))
        .forEach(([key, value]) => {
          parts.push(`- ${key}: ${value}`);
        });
    }

    return parts.join('\n');
  }

  /**
   * Convert Zod schema to JSON schema
   */
  private zodToJsonSchema(schema: unknown): unknown {
    return zodToJsonSchema(schema, {
      name: 'StructuredOutput',
      $refStrategy: 'none', // Inline all definitions
    });
  }

  /**
   * Map Claude stop reason to our finish reason
   */
  private mapStopReason(
    stopReason: string | null
  ): 'end_turn' | 'max_tokens' | 'stop_sequence' {
    switch (stopReason) {
      case 'end_turn':
        return 'end_turn';
      case 'max_tokens':
        return 'max_tokens';
      case 'stop_sequence':
        return 'stop_sequence';
      default:
        return 'end_turn';
    }
  }

  /**
   * Handle and classify errors
   */
  private handleError(error: unknown): LLMErrorClass {
    if (error instanceof LLMErrorClass) {
      return error;
    }

    // Anthropic API errors
    if (error.status) {
      const statusCode = error.status;
      if (statusCode === 401 || statusCode === 403) {
        return new LLMErrorClass(
          'authentication',
          'Invalid API key or authentication failed',
          false,
          statusCode
        );
      }
      if (statusCode === 429) {
        return new LLMErrorClass('rate_limit', 'Rate limit exceeded', true, statusCode);
      }
      if (statusCode >= 500) {
        return new LLMErrorClass('api_error', 'API server error', true, statusCode);
      }
      return new LLMErrorClass('invalid_request', error.message, false, statusCode);
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return new LLMErrorClass('timeout', 'Request timed out', true);
    }

    // Generic error
    return new LLMErrorClass('api_error', error.message || 'Unknown error', false);
  }

}

/**
 * Singleton instance
 */
let llmServiceInstance: LLMService | null = null;

/**
 * Get or create LLMService instance
 */
export function getLLMService(apiKey?: string): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService(apiKey);
  }
  return llmServiceInstance;
}
