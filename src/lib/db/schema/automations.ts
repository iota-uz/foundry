/**
 * Automations database schema
 *
 * Stores workflow automation rules triggered by GitHub Project status changes.
 * Each automation can have multiple conditional transitions based on execution results.
 */

import { pgTable, text, timestamp, uuid, integer, boolean, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { workflows } from './workflows';

/**
 * Trigger types for automations
 */
export type TriggerType = 'status_enter' | 'manual';

/**
 * Transition condition types
 */
export type TransitionCondition = 'success' | 'failure' | 'custom';

/**
 * Project automations table - trigger rules for workflows
 */
export const projectAutomations = pgTable(
  'project_automations',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to project */
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),

    /** Automation name */
    name: text('name').notNull(),

    /** Trigger type */
    triggerType: text('trigger_type', {
      enum: ['status_enter', 'manual'],
    }).notNull(),

    /** Status name that triggers this automation (for status_enter) */
    triggerStatus: text('trigger_status'),

    /** Button label for manual triggers */
    buttonLabel: text('button_label'),

    /** Reference to workflow to execute */
    workflowId: uuid('workflow_id').references(() => workflows.id, {
      onDelete: 'set null',
    }),

    /** Whether this automation is enabled */
    enabled: boolean('enabled').default(true).notNull(),

    /** Execution priority (lower number = higher priority) */
    priority: integer('priority').default(0).notNull(),

    /** Creation timestamp */
    createdAt: timestamp('created_at').defaultNow().notNull(),

    /** Last update timestamp */
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_automation_project').on(table.projectId),
    index('idx_automation_trigger').on(table.triggerType, table.triggerStatus),
    index('idx_automation_priority').on(table.priority),
  ]
);

/**
 * Project status transitions table - conditional outputs after workflow execution
 */
export const projectStatusTransitions = pgTable(
  'project_status_transitions',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to automation */
    automationId: uuid('automation_id')
      .references(() => projectAutomations.id, { onDelete: 'cascade' })
      .notNull(),

    /** Condition type */
    condition: text('condition', {
      enum: ['success', 'failure', 'custom'],
    }).notNull(),

    /** JavaScript expression for custom conditions */
    customExpression: text('custom_expression'),

    /** Status to transition to */
    nextStatus: text('next_status').notNull(),

    /** Priority for multiple matching conditions (lower = higher) */
    priority: integer('priority').default(0).notNull(),
  },
  (table) => [
    index('idx_transition_automation').on(table.automationId),
    index('idx_transition_priority').on(table.priority),
  ]
);

export type ProjectAutomation = typeof projectAutomations.$inferSelect;
export type NewProjectAutomation = typeof projectAutomations.$inferInsert;
export type ProjectStatusTransition = typeof projectStatusTransitions.$inferSelect;
export type NewProjectStatusTransition = typeof projectStatusTransitions.$inferInsert;
