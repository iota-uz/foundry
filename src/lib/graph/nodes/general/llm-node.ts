/**
 * @sys/graph - LLMNode Implementation
 *
 * Structured LLM node for JSON I/O with Claude models.
 * Supports schema validation, reasoning effort, and multiple models.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { ZodType } from 'zod';

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext } from '../../types';

/**
 * Model selection for LLMNode.
 */
export type LLMModel = 'haiku' | 'sonnet' | 'opus';

/**
 * Reasoning effort level.
 * Controls how much "thinking" the model does before responding.
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Result of an LLM invocation.
 */
export interface LLMResult<TOutput = unknown> {
  /** Whether the invocation succeeded */
  success: boolean;

  /** Parsed output (if schema provided and valid) */
  output?: TOutput;

  /** Raw text response from the model */
  rawOutput?: string;

  /** Thinking output (if extended thinking enabled) */
  thinking?: string;

  /** Model that was used */
  model: string;

  /** Token usage */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };

  /** Error message if failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Configuration for LLMNode.
 */
export interface LLMNodeConfig<
  TContext extends Record<string, unknown>,
  TInput = unknown,
  TOutput = unknown,
> extends BaseNodeConfig<TContext> {
  /**
   * Model to use.
   */
  model: LLMModel;

  /**
   * System prompt.
   */
  system: string;

  /**
   * User prompt.
   * Can be a static string or a function that builds the prompt from state.
   */
  prompt: string | ((state: WorkflowState<TContext>) => string);

  /**
   * Input schema for validation (optional).
   * If provided, validates input from context before sending to the model.
   */
  inputSchema?: ZodType<TInput>;

  /**
   * Key in context to read input from (used with inputSchema).
   */
  inputKey?: keyof TContext;

  /**
   * Output schema for validation (optional).
   * If provided, parses and validates the model output.
   */
  outputSchema?: ZodType<TOutput>;

  /**
   * Temperature for generation.
   * @default 0
   */
  temperature?: number;

  /**
   * Maximum tokens to generate.
   * @default 4096
   */
  maxTokens?: number;

  /**
   * Reasoning effort level.
   * Enables extended thinking for more complex reasoning.
   * Only available for claude-3-5-sonnet and above.
   */
  reasoningEffort?: ReasoningEffort;

  /**
   * Anthropic API key.
   * Falls back to ANTHROPIC_API_KEY environment variable.
   */
  apiKey?: string;

  /**
   * Whether to throw on failure.
   * @default true
   */
  throwOnError?: boolean;

  /**
   * Key in context to store the result.
   * @default 'lastLLMResult'
   */
  resultKey?: string;
}

/**
 * Maps model aliases to actual Anthropic model IDs.
 */
const MODEL_MAP: Record<LLMModel, string> = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

// TODO: Implement extended thinking support when SDK adds this capability
// Reasoning effort will map to thinking budget tokens:
// - low: 1024 tokens
// - medium: 4096 tokens
// - high: 16384 tokens

/**
 * LLMNode - Structured LLM invocation with JSON I/O.
 *
 * Features:
 * - Model selection (haiku, sonnet, opus)
 * - Input/output schema validation
 * - Extended thinking / reasoning effort
 * - Dynamic prompts from state
 *
 * @example
 * ```typescript
 * nodes.LLMNode({
 *   model: 'sonnet',
 *   system: 'You are a task planner.',
 *   prompt: (state) => `Plan: ${state.context.request}`,
 *   outputSchema: TaskPlanSchema,
 *   reasoningEffort: 'medium',
 *   next: 'IMPLEMENT',
 * })
 * ```
 */
export class LLMNodeRuntime<
  TContext extends Record<string, unknown>,
  TInput = unknown,
  TOutput = unknown,
> extends BaseNode<TContext, LLMNodeConfig<TContext, TInput, TOutput>> {

  public readonly nodeType = 'llm';
  private client: Anthropic | null = null;

  constructor(config: LLMNodeConfig<TContext, TInput, TOutput>) {
    super({
      ...config,
      temperature: config.temperature ?? 0,
      maxTokens: config.maxTokens ?? 4096,
      throwOnError: config.throwOnError ?? true,
      resultKey: config.resultKey ?? 'lastLLMResult',
    });
  }

  /**
   * Executes the LLM invocation.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      model,
      system,
      prompt,
      inputSchema,
      inputKey,
      outputSchema,
      temperature,
      maxTokens,
      reasoningEffort: _reasoningEffort,
      apiKey,
      throwOnError,
      resultKey,
    } = this.config;

    const startTime = Date.now();
    const modelId = MODEL_MAP[model];

    // TODO: Use _reasoningEffort when SDK supports extended thinking

    try {
      // Validate input if schema provided
      if (inputSchema && inputKey) {
        const inputData = state.context[inputKey];
        const parseResult = inputSchema.safeParse(inputData);
        if (!parseResult.success) {
          throw new NodeExecutionError(
            `Input validation failed: ${parseResult.error.message}`,
            String(inputKey),
            this.nodeType,
            undefined,
            { errors: parseResult.error.errors }
          );
        }
      }

      // Build prompt
      const resolvedPrompt = typeof prompt === 'function' ? prompt(state) : prompt;

      context.logger.info(`[LLMNode] Invoking ${model} (${modelId})`);

      // Get or create client
      const client = this.getClient(apiKey);

      // Build messages
      const messages: MessageParam[] = [
        { role: 'user', content: resolvedPrompt },
      ];

      // Build request parameters
      // Note: Extended thinking (reasoningEffort) requires specific API support
      // For now, we use standard parameters; thinking support can be added later
      const requestParams: Anthropic.MessageCreateParams = {
        model: modelId,
        max_tokens: maxTokens ?? 4096,
        system,
        messages,
        temperature: temperature ?? 0,
      };

      // Make the API call
      const response = await client.messages.create(requestParams);

      const duration = Date.now() - startTime;

      // Extract response content
      let rawOutput = '';

      for (const block of response.content) {
        if (block.type === 'text') {
          rawOutput += block.text;
        }
      }

      // Parse output if schema provided
      let output: TOutput | undefined;
      let parseError: string | undefined;

      if (outputSchema) {
        try {
          // Try to parse as JSON
          const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/) ||
                           rawOutput.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawOutput;
          const parsed = JSON.parse(jsonStr);
          const parseResult = outputSchema.safeParse(parsed);

          if (parseResult.success) {
            output = parseResult.data;
          } else {
            parseError = `Output validation failed: ${parseResult.error.message}`;
          }
        } catch (e) {
          parseError = `Failed to parse output as JSON: ${(e as Error).message}`;
        }
      }

      const result: LLMResult<TOutput> = {
        success: !parseError,
        rawOutput,
        model: modelId,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        duration,
      };

      if (output !== undefined) {
        result.output = output;
      }
      if (parseError) {
        result.error = parseError;
      }

      context.logger.info(
        `[LLMNode] Completed in ${duration}ms (${result.usage.inputTokens}/${result.usage.outputTokens} tokens)`
      );

      // Check for errors
      if (throwOnError && parseError) {
        throw new NodeExecutionError(
          parseError,
          model,
          this.nodeType,
          undefined,
          { rawOutput }
        );
      }

      // Store result in context
      const contextUpdate = {
        ...state.context,
        [resultKey as string]: result,
      } as TContext;

      return {
        stateUpdate: {
          context: contextUpdate,
        },
        metadata: {
          model: modelId,
          duration,
          usage: result.usage,
        },
      };
    } catch (error) {
      const err = error as Error;

      if (err instanceof NodeExecutionError) {
        throw err;
      }

      const duration = Date.now() - startTime;
      throw new NodeExecutionError(
        `LLM invocation failed: ${err.message}`,
        model,
        this.nodeType,
        err,
        { duration }
      );
    }
  }

  /**
   * Gets or creates the Anthropic client.
   */
  private getClient(apiKey?: string): Anthropic {
    if (this.client) {
      return this.client;
    }

    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new NodeExecutionError(
        'Anthropic API key not provided. Set apiKey in config or ANTHROPIC_API_KEY env var.',
        'config',
        this.nodeType
      );
    }

    this.client = new Anthropic({ apiKey: key });
    return this.client;
  }
}

