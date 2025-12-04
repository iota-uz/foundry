/**
 * @sys/graph - Structured logging utility
 *
 * Provides enhanced logging with context and formatting for debugging workflows.
 */

export interface LogContext {
  workflowId?: string;
  node?: string;
  [key: string]: any;
}

/**
 * Creates a structured logger with context.
 * For now, this is a simple wrapper around console, but can be extended
 * to support structured logging systems like Winston or Pino.
 */
export function createLogger(context: LogContext = {}): Console {
  const formatMessage = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    return `[${timestamp}] [${level}] ${contextStr ? `[${contextStr}] ` : ''}${message}`;
  };

  return {
    ...console,
    log: (...args: any[]) => console.log(formatMessage('INFO', args.join(' '))),
    info: (...args: any[]) => console.info(formatMessage('INFO', args.join(' '))),
    warn: (...args: any[]) => console.warn(formatMessage('WARN', args.join(' '))),
    error: (...args: any[]) => console.error(formatMessage('ERROR', args.join(' '))),
    debug: (...args: any[]) => console.debug(formatMessage('DEBUG', args.join(' '))),
  };
}
