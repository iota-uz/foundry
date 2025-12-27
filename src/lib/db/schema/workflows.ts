/**
 * Workflow database schema
 *
 * Stores workflow definitions created in the visual builder.
 * Each workflow contains nodes (React Flow format) and edges (connections).
 * Workflows belong to a project.
 */

import { pgTable, text, timestamp, jsonb, uuid, index, boolean } from 'drizzle-orm/pg-core';
import { projects } from './projects';

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
 * Visual metadata for DSL round-tripping.
 * Contains node positions and edge styling that's ignored at runtime.
 */
export interface WorkflowMeta {
  /** Layout algorithm used (e.g., 'dagre', 'manual') */
  layout?: string;
  /** Layout direction ('LR', 'TB', etc.) */
  direction?: string;
  /** Node position overrides by node ID */
  nodes?: Record<string, { x: number; y: number }>;
  /** Edge metadata by edge ID or 'source->target' format */
  edges?: Record<string, { label?: string; animated?: boolean }>;
}

/**
 * Workflows table - stores workflow definitions
 */
export const workflows = pgTable(
  'workflows',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to project (required) */
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),

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

    /** Visual metadata for DSL round-tripping (node positions, edge labels, etc.) */
    meta: jsonb('meta').$type<WorkflowMeta>(),

    /** Cached DSL code for quick export */
    dslCache: text('dsl_cache'),

    /** True if DSL cache needs refresh after workflow changes */
    dslDirty: boolean('dsl_dirty').default(true),

    /** Creation timestamp */
    createdAt: timestamp('created_at').defaultNow().notNull(),

    /** Last update timestamp */
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_workflow_project').on(table.projectId),
  ]
);

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
