/**
 * Environment variable utilities
 * Check for ANTHROPIC_API_KEY in environment
 */

/**
 * Check if ANTHROPIC_API_KEY exists in environment
 */
export function hasApiKeyInEnv(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey !== undefined && apiKey !== null && apiKey !== '';
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

/**
 * Get a required environment variable
 * Throws if the variable is not set
 */
export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getEnvVarOptional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}
