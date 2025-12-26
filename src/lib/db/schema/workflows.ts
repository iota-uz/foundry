/**
 * Workflow database schema
 *
 * Stores workflow definitions created in the visual builder.
 * Each workflow contains nodes (React Flow format) and edges (connections).
 */

import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

/**
 * Workflow node as stored in the database.
 * Compatible with React Flow node format.
 */
export interface WorkflowNodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/**
 * Workflow edge as stored in the database.
 * Compatible with React Flow edge format.
 */
export interface WorkflowEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, unknown>;
}

/**
 * Workflows table - stores workflow definitions
 */
export const workflows = pgTable('workflows', {
  /** Unique identifier */
  id: uuid('id').primaryKey().defaultRandom(),

  /** Human-readable workflow name */
  name: text('name').notNull(),

  /** Optional description */
  description: text('description'),

  /** React Flow nodes (visual representation) */
  nodes: jsonb('nodes').notNull().$type<WorkflowNodeData[]>(),

  /** React Flow edges (connections between nodes) */
  edges: jsonb('edges').notNull().$type<WorkflowEdgeData[]>(),

  /** Initial context passed to workflow execution */
  initialContext: jsonb('initial_context').$type<Record<string, unknown>>(),

  /** Docker image for container-based execution (optional) */
  dockerImage: text('docker_image'),

  /** Creation timestamp */
  createdAt: timestamp('created_at').defaultNow().notNull(),

  /** Last update timestamp */
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
