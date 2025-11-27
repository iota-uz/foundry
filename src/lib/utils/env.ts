/**
 * Environment variable utilities
 * Check for ANTHROPIC_API_KEY in environment
 */

/**
 * Check if ANTHROPIC_API_KEY exists in environment
 */
export function hasApiKeyInEnv(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Get API key from environment
 */
export function getApiKeyFromEnv(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

/**
 * Validate API key format (basic validation)
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Anthropic API keys start with 'sk-ant-'
  return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
}
