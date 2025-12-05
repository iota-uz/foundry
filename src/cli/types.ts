/**
 * CLI type definitions
 *
 * Shared types used across CLI commands.
 */

/**
 * Configuration for the run command.
 */
export interface RunConfig {
  /** Path to the workflow configuration file */
  configPath: string;

  /** Initial context JSON string or object */
  context: Record<string, unknown> | undefined;

  /** Directory for state files (default: .ci) */
  stateDir: string;

  /** Anthropic API key */
  apiKey: string;

  /** Enable verbose logging */
  verbose: boolean;

  /** Dry run mode - validate without executing */
  dryRun: boolean;
}

/**
 * Error thrown for CLI-related errors.
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CliError';
  }
}
