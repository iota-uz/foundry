/**
 * Workflow secrets database schema
 *
 * Stores encrypted environment variables for workflow execution.
 * Values are encrypted using AES-256-GCM before storage.
 */

import { pgTable, text, timestamp, uuid, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { workflows } from './workflows';

/**
 * Workflow secrets table - encrypted environment variables
 */
export const workflowSecrets = pgTable(
  'workflow_secrets',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to workflow */
    workflowId: uuid('workflow_id')
      .references(() => workflows.id, { onDelete: 'cascade' })
      .notNull(),

    /** Environment variable key (e.g., "DATABASE_URL") */
    key: text('key').notNull(),

    /** Encrypted value (AES-256-GCM) */
    encryptedValue: text('encrypted_value').notNull(),

    /** Creation timestamp */
    createdAt: timestamp('created_at').defaultNow().notNull(),

    /** Last update timestamp */
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Each workflow can only have one secret per key
    uniqueIndex('idx_workflow_secrets_unique').on(table.workflowId, table.key),
    // Index for looking up secrets by workflow
    index('idx_workflow_secrets_workflow').on(table.workflowId),
  ]
);

export type WorkflowSecret = typeof workflowSecrets.$inferSelect;
export type NewWorkflowSecret = typeof workflowSecrets.$inferInsert;
