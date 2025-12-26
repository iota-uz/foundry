/**
 * LLM Providers Index
 *
 * Exports provider factory function and all provider implementations.
 */

import { LLMProvider, getProviderForModel, type LLMModelId } from '@/lib/graph/enums';
import type { BaseLLMProvider } from './base';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';

// Re-export types
export type { LLMRequest, LLMResponse, BaseLLMProvider } from './base';

/**
 * Singleton provider instances.
 * Providers are stateless (except for cached clients), so we can share instances.
 */
const providers: Record<LLMProvider, BaseLLMProvider> = {
  [LLMProvider.Anthropic]: new AnthropicProvider(),
  [LLMProvider.OpenAI]: new OpenAIProvider(),
  [LLMProvider.Gemini]: new GeminiProvider(),
};

/**
 * Get the appropriate provider for a given model ID.
 * @param modelId The LLM model ID
 * @returns The provider implementation for that model
 */
export function getProvider(modelId: LLMModelId): BaseLLMProvider {
  const providerType = getProviderForModel(modelId);
  return providers[providerType];
}

/**
 * Get the appropriate API key environment variable name for a provider.
 * @param provider The LLM provider
 * @returns The environment variable name for the API key
 */
export function getApiKeyEnvVar(provider: LLMProvider): string {
  switch (provider) {
    case LLMProvider.Anthropic:
      return 'ANTHROPIC_API_KEY';
    case LLMProvider.OpenAI:
      return 'OPENAI_API_KEY';
    case LLMProvider.Gemini:
      return 'GEMINI_API_KEY';
  }
}

/**
 * Get the API key for a model, checking config first then environment.
 * @param modelId The LLM model ID
 * @param configApiKey Optional API key from config
 * @returns The API key to use
 * @throws Error if no API key is available
 */
export function resolveApiKey(modelId: LLMModelId, configApiKey?: string): string {
  if (configApiKey !== undefined && configApiKey !== '') {
    return configApiKey;
  }

  const providerType = getProviderForModel(modelId);
  const envVar = getApiKeyEnvVar(providerType);
  const envKey = process.env[envVar];

  if (envKey === undefined || envKey === '') {
    throw new Error(
      `No API key available for ${modelId}. Set ${envVar} environment variable or provide apiKey in config.`
    );
  }

  return envKey;
}
