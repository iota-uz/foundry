/**
 * @sys/logging - Structured JSON logging for Railway
 *
 * Provides Railway-compatible structured logging with:
 * - JSON output (minified in production, pretty in development)
 * - Log level filtering
 * - Contextual loggers (child loggers)
 * - Error formatting with stack traces
 */

import type { LogLevel, LogEntry, LogContext, LoggerConfig } from './types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Gets the minimum log level from environment or defaults.
 * Default: 'info' in production, 'debug' in development
 */
function getDefaultMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Gets whether to pretty-print JSON logs.
 * Default: true in development, false in production
 */
function getDefaultPrettyPrint(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Structured logger with Railway-compatible JSON output.
 */
export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;
  private prettyPrint: boolean;

  constructor(config: LoggerConfig = {}) {
    this.context = config.context ?? {};
    this.minLevel = config.minLevel ?? getDefaultMinLevel();
    this.prettyPrint = config.prettyPrint ?? getDefaultPrettyPrint();
  }

  /**
   * Creates a child logger with additional context.
   * The child inherits the parent's configuration and merges context.
   */
  child(context: LogContext): Logger {
    const mergedContext = { ...this.context, ...context };
    return new Logger({
      minLevel: this.minLevel,
      prettyPrint: this.prettyPrint,
      context: mergedContext,
    });
  }

  /**
   * Logs a debug message.
   */
  debug(message: string, attributes?: Record<string, unknown>): void {
    this.logStructured('debug', message, attributes);
  }

  /**
   * Logs an info message.
   */
  info(message: string, attributes?: Record<string, unknown>): void {
    this.logStructured('info', message, attributes);
  }

  /**
   * Logs a warning message.
   */
  warn(message: string, attributes?: Record<string, unknown>): void {
    this.logStructured('warn', message, attributes);
  }

  /**
   * Logs an error message. Pass error object via attributes.error.
   */
  error(message: string, attributes?: Record<string, unknown>): void {
    const errorAttrs = attributes?.error ? this.formatError(attributes.error) : {};
    this.logStructured('error', message, { ...errorAttrs, ...attributes });
  }

  /**
   * Internal log method that outputs JSON to console.
   */
  private logStructured(level: LogLevel, message: string, attributes?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...attributes,
    };

    const output = this.prettyPrint
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

    // Use console.error for error level, console.log for everything else
    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Formats an error object for structured logging.
   */
  private formatError(error: Error | unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
    return { error: String(error) };
  }
}

/**
 * Creates a new logger instance with optional context.
 * This is the main factory function for creating loggers.
 */
export function createLogger(context?: LogContext): Logger {
  const config: LoggerConfig = context ? { context } : {};
  return new Logger(config);
}
