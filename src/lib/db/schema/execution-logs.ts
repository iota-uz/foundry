/**
 * Execution logs database schema
 *
 * Stores detailed logs for workflow executions.
 * Useful for debugging and auditing workflow runs.
 */

import { pgTable, text, timestamp, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { workflowExecutions } from './workflow-executions';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Execution logs table - stores execution logs
 */
export const executionLogs = pgTable(
  'execution_logs',
  {
    /** Unique log entry identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to the execution */
    executionId: uuid('execution_id')
      .references(() => workflowExecutions.id, { onDelete: 'cascade' })
      .notNull(),

    /** Node that generated this log (null for workflow-level logs) */
    nodeId: text('node_id'),

    /** Log level */
    level: text('level', {
      enum: ['debug', 'info', 'warn', 'error'],
    }).notNull(),

    /** Log message */
    message: text('message').notNull(),

    /** Additional structured metadata */
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    /** When this log was created */
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => [
    index('idx_log_execution').on(table.executionId),
    index('idx_log_level').on(table.level),
    index('idx_log_timestamp').on(table.timestamp),
  ]
);

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
