/**
 * Issue metadata database schema
 *
 * Stores Foundry-specific metadata for GitHub issues in synced projects.
 * Tracks issue state, AI-generated plans, and execution history.
 */

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { projectAutomations } from './automations';
import { workflowExecutions } from './workflow-executions';

/**
 * Issue metadata table - Foundry-specific issue data
 */
export const issueMetadata = pgTable(
  'issue_metadata',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to project */
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),

    /** GitHub issue GraphQL node ID */
    githubIssueId: text('github_issue_id').notNull(),

    /** GitHub Project item ID */
    githubItemId: text('github_item_id'),

    /** Repository owner */
    owner: text('owner').notNull(),

    /** Repository name */
    repo: text('repo').notNull(),

    /** Issue number */
    issueNumber: integer('issue_number').notNull(),

    /** Current status (cached from GitHub) */
    currentStatus: text('current_status'),

    /** AI-generated plan content */
    planContent: jsonb('plan_content').$type<Record<string, unknown>>(),

    /** User-defined custom fields */
    customFields: jsonb('custom_fields').$type<Record<string, unknown>>(),

    /** Last sync timestamp */
    lastSyncedAt: timestamp('last_synced_at'),

    /** Creation timestamp */
    createdAt: timestamp('created_at').defaultNow().notNull(),

    /** Last update timestamp */
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_issue_project').on(table.projectId),
    index('idx_issue_status').on(table.currentStatus),
    index('idx_issue_github').on(table.githubIssueId),
    // Unique constraint: one issue per project
    uniqueIndex('idx_issue_unique').on(
      table.projectId,
      table.owner,
      table.repo,
      table.issueNumber
    ),
  ]
);

/**
 * Execution result types
 */
export type ExecutionResult = 'success' | 'failure' | 'cancelled';

/**
 * Issue executions table - workflow execution history
 */
export const issueExecutions = pgTable(
  'issue_executions',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to issue metadata */
    issueMetadataId: uuid('issue_metadata_id')
      .references(() => issueMetadata.id, { onDelete: 'cascade' })
      .notNull(),

    /** Reference to workflow execution (nullable if deleted) */
    workflowExecutionId: uuid('workflow_execution_id').references(
      () => workflowExecutions.id,
      { onDelete: 'set null' }
    ),

    /** Reference to automation that triggered this (nullable if deleted) */
    automationId: uuid('automation_id').references(() => projectAutomations.id, {
      onDelete: 'set null',
    }),

    /** How this execution was triggered */
    triggeredBy: text('triggered_by', {
      enum: ['status_enter', 'manual'],
    }).notNull(),

    /** Status that triggered this execution */
    triggerStatus: text('trigger_status'),

    /** Status before execution started */
    fromStatus: text('from_status'),

    /** Execution result */
    result: text('result', {
      enum: ['success', 'failure', 'cancelled'],
    }),

    /** Status issue was moved to after execution */
    nextStatusApplied: text('next_status_applied'),

    /** Error message if execution failed */
    errorMessage: text('error_message'),

    /** When execution started */
    startedAt: timestamp('started_at').defaultNow().notNull(),

    /** When execution completed */
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('idx_issue_execution_issue').on(table.issueMetadataId),
    index('idx_issue_execution_result').on(table.result),
    index('idx_issue_execution_started').on(table.startedAt),
  ]
);

export type IssueMetadata = typeof issueMetadata.$inferSelect;
export type NewIssueMetadata = typeof issueMetadata.$inferInsert;
export type IssueExecution = typeof issueExecutions.$inferSelect;
export type NewIssueExecution = typeof issueExecutions.$inferInsert;
