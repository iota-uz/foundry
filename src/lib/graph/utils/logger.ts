/**
 * @sys/graph - Structured logging utility
 *
 * Provides enhanced logging with context and formatting for debugging workflows.
 */

export interface LogContext {
  workflowId?: string;
  node?: string;
  [key: string]: unknown;
}

/**
 * Creates a structured logger with context.
 *
 * NOTE: This logger only provides structured formatting for the following methods:
 * log, info, warn, error, debug. Other Console methods (table, dir, trace, etc.)
 * are passed through without formatting. For full structured logging support,
 * consider integrating with a dedicated logging library like Winston or Pino.
 *
 * For now, this is a simple wrapper around console, but can be extended
 * to support structured logging systems like Winston or Pino.
 */
export function createLogger(context: LogContext = {}): Console {
  const formatPrefix = (level: string): string => {
    const timestamp = new Date().toISOString();
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    return `[${timestamp}] [${level}]${contextStr ? ` [${contextStr}]` : ''}`;
  };

  return {
    ...console,
    // Preserve native argument handling by passing prefix separately
    log: (...args: unknown[]) => console.log(formatPrefix('INFO'), ...args),
    info: (...args: unknown[]) => console.info(formatPrefix('INFO'), ...args),
    warn: (...args: unknown[]) => console.warn(formatPrefix('WARN'), ...args),
    error: (...args: unknown[]) => console.error(formatPrefix('ERROR'), ...args),
    debug: (...args: unknown[]) => console.debug(formatPrefix('DEBUG'), ...args),
  };
}
