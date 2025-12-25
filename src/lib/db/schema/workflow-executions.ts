/**
 * Workflow execution database schema
 *
 * Tracks individual workflow execution instances.
 * Each execution represents a single run of a workflow.
 */

import { pgTable, text, timestamp, jsonb, uuid, integer, index } from 'drizzle-orm/pg-core';
import { workflows } from './workflows';

/**
 * Node execution state during workflow run
 */
export interface NodeExecutionState {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

/**
 * Workflow executions table - tracks individual runs
 */
export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    /** Unique execution identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to the workflow being executed */
    workflowId: uuid('workflow_id')
      .references(() => workflows.id, { onDelete: 'cascade' })
      .notNull(),

    /** Current execution status */
    status: text('status', {
      enum: ['pending', 'running', 'paused', 'completed', 'failed'],
    })
      .notNull()
      .default('pending'),

    /** Current node being executed */
    currentNode: text('current_node').notNull(),

    /** Execution context (user-defined data) */
    context: jsonb('context').notNull().$type<Record<string, unknown>>(),

    /** AI conversation history for resumability */
    conversationHistory: jsonb('conversation_history').default([]).$type<unknown[]>(),

    /** Per-node execution states */
    nodeStates: jsonb('node_states').default({}).$type<Record<string, NodeExecutionState>>(),

    /** Last error message (if failed) */
    lastError: text('last_error'),

    /** Number of retry attempts */
    retryCount: integer('retry_count').default(0).notNull(),

    /** When execution started */
    startedAt: timestamp('started_at').defaultNow().notNull(),

    /** When execution completed (success or failure) */
    completedAt: timestamp('completed_at'),

    /** Last update timestamp */
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_execution_workflow').on(table.workflowId),
    index('idx_execution_status').on(table.status),
    index('idx_execution_started').on(table.startedAt),
  ]
);

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
