/**
 * @sys/logging - Type definitions for structured logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  message: string;          // Required by Railway
  timestamp: string;        // ISO 8601
  level: LogLevel;
  requestId?: string;       // Railway's X-Request-Id
  workflowId?: string;
  nodeId?: string;
  [key: string]: unknown;   // Custom attributes queryable via @key:value
}

export interface LogContext {
  workflowId?: string;
  nodeId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface LoggerConfig {
  minLevel?: LogLevel;
  prettyPrint?: boolean;
  context?: LogContext;
}
