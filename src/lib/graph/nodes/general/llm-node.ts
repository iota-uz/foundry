/**
 * @sys/graph - LLMNode Implementation
 *
 * Multi-provider LLM node supporting Anthropic, OpenAI, and Gemini models.
 * Features:
 * - Schema validation for structured output
 * - Reasoning/thinking mode for supported models
 * - Web search for supported models
 * - Variable interpolation in prompts
 */

import type { ZodType } from 'zod';

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext } from '../../types';
import {
  type LLMModelId,
  getModelMetadata,
  getProviderForModel,
} from '../../enums';
import {
  getProvider,
  resolveApiKey,
  type LLMRequest,
  type LLMResponse,
} from '../llm/providers';
import { interpolatePrompt } from '../llm/interpolation';

/**
 * Reasoning effort level.
 * Controls how much "thinking" the model does before responding.
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Output mode for LLM responses.
 */
export type OutputMode = 'text' | 'json';

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

  /** Provider that was used */
  provider: string;

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
  TOutput = unknown,
> extends BaseNodeConfig<TContext> {
  /**
   * Model to use (supports all providers).
   */
  model: LLMModelId;

  /**
   * System prompt (instructions for the model).
   */
  systemPrompt: string;

  /**
   * User prompt.
   * Supports {{variable}} interpolation from workflow context.
   * Can be a static string or a function that builds the prompt from state.
   */
  userPrompt: string | ((state: WorkflowState<TContext>) => string);

  /**
   * Output mode: 'text' for free-form, 'json' for structured output.
   * @default 'text'
   */
  outputMode?: OutputMode;

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
   * Enable web search (for models that support it).
   * @default false
   */
  enableWebSearch?: boolean;

  /**
   * Reasoning effort level.
   * Enables extended thinking for more complex reasoning.
   * Only effective for models that support reasoning.
   */
  reasoningEffort?: ReasoningEffort;

  /**
   * API key for the provider.
   * Falls back to provider-specific environment variables:
   * - Anthropic: ANTHROPIC_API_KEY
   * - OpenAI: OPENAI_API_KEY
   * - Gemini: GEMINI_API_KEY
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
 * LLMNode - Multi-provider LLM invocation with structured I/O.
 *
 * Supports:
 * - Anthropic Claude (opus, sonnet, haiku)
 * - OpenAI GPT-5 (5.2, pro, mini, nano)
 * - Google Gemini (3 pro, 3 flash)
 *
 * Features:
 * - Model selection across providers
 * - Output schema validation
 * - Extended thinking / reasoning effort
 * - Web search (for supported models)
 * - Variable interpolation in prompts
 *
 * @example
 * ```typescript
 * schema.llm('ANALYZE', {
 *   model: 'claude-sonnet-4-5',
 *   systemPrompt: 'You are a code analyzer.',
 *   userPrompt: 'Analyze: {{request}}',
 *   outputMode: 'json',
 *   outputSchema: AnalysisSchema,
 *   reasoningEffort: 'medium',
 *   then: 'IMPLEMENT',
 * })
 * ```
 */
export class LLMNodeRuntime<
  TContext extends Record<string, unknown>,
  TOutput = unknown,
> extends BaseNode<TContext, LLMNodeConfig<TContext, TOutput>> {

  public readonly nodeType = 'llm';

  constructor(config: LLMNodeConfig<TContext, TOutput>) {
    super({
      ...config,
      outputMode: config.outputMode ?? 'text',
      temperature: config.temperature ?? 0,
      maxTokens: config.maxTokens ?? 4096,
      enableWebSearch: config.enableWebSearch ?? false,
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
      systemPrompt,
      userPrompt,
      outputMode,
      outputSchema,
      temperature,
      maxTokens,
      enableWebSearch,
      reasoningEffort,
      apiKey,
      throwOnError,
      resultKey,
    } = this.config;

    const startTime = Date.now();
    const metadata = getModelMetadata(model);
    const providerType = getProviderForModel(model);

    context.logger.info(
      `[LLMNode] Invoking ${model} (${metadata?.displayName ?? model}) via ${providerType}`
    );

    try {
      // Resolve API key
      const resolvedApiKey = resolveApiKey(model, apiKey);

      // Build the user prompt with interpolation
      let resolvedUserPrompt: string;
      if (typeof userPrompt === 'function') {
        resolvedUserPrompt = userPrompt(state);
      } else {
        resolvedUserPrompt = interpolatePrompt(userPrompt, state.context);
      }

      // Also interpolate system prompt
      const resolvedSystemPrompt = interpolatePrompt(systemPrompt, state.context);

      // Build LLM request
      const request: LLMRequest = {
        model,
        systemPrompt: resolvedSystemPrompt,
        userPrompt: resolvedUserPrompt,
        outputMode: outputMode ?? 'text',
      };

      // Add optional parameters only if defined
      if (temperature !== undefined) {
        request.temperature = temperature;
      }
      if (maxTokens !== undefined) {
        request.maxTokens = maxTokens;
      }
      if (enableWebSearch !== undefined) {
        request.enableWebSearch = enableWebSearch;
      }
      if (reasoningEffort !== undefined) {
        request.reasoningEffort = reasoningEffort;
      }

      // Get provider and execute
      const provider = getProvider(model);
      const response: LLMResponse = await provider.execute(request, resolvedApiKey);

      const duration = Date.now() - startTime;

      // Validate output with Zod schema if provided
      let validatedOutput: TOutput | undefined;
      let validationError: string | undefined;

      if (response.success && outputSchema !== undefined && response.output !== undefined) {
        const parseResult = outputSchema.safeParse(response.output);
        if (parseResult.success) {
          validatedOutput = parseResult.data;
        } else {
          validationError = `Output validation failed: ${parseResult.error.message}`;
        }
      } else if (response.success && outputSchema !== undefined && outputMode === 'json') {
        // Try to parse rawOutput as JSON and validate
        try {
          const parsed: unknown = JSON.parse(response.rawOutput);
          const parseResult = outputSchema.safeParse(parsed);
          if (parseResult.success) {
            validatedOutput = parseResult.data;
          } else {
            validationError = `Output validation failed: ${parseResult.error.message}`;
          }
        } catch (e) {
          validationError = `Failed to parse output as JSON: ${(e as Error).message}`;
        }
      }

      // Build result
      const result: LLMResult<TOutput> = {
        success: response.success && validationError === undefined,
        rawOutput: response.rawOutput,
        model,
        provider: providerType,
        usage: response.usage,
        duration,
      };

      if (validatedOutput !== undefined) {
        result.output = validatedOutput;
      } else if (response.output !== undefined) {
        result.output = response.output as TOutput;
      }

      if (response.thinking !== undefined) {
        result.thinking = response.thinking;
      }

      if (response.error !== undefined) {
        result.error = response.error;
      } else if (validationError !== undefined) {
        result.error = validationError;
      }

      context.logger.info(
        `[LLMNode] Completed in ${duration}ms (${result.usage.inputTokens}/${result.usage.outputTokens} tokens)`
      );

      // Check for errors
      const hasError = !result.success || result.error !== undefined;
      if (throwOnError === true && hasError) {
        throw new NodeExecutionError(
          result.error ?? 'LLM invocation failed',
          model,
          this.nodeType,
          undefined,
          { rawOutput: response.rawOutput }
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
          model,
          provider: providerType,
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
}
