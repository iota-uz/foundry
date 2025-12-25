/**
 * Projects database schema
 *
 * Stores GitHub Projects V2 integration configuration.
 * Each project represents a synced Kanban board with linked repositories.
 */

import { pgTable, text, timestamp, uuid, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Projects table - GitHub Projects V2 integration
 */
export const projects = pgTable(
  'projects',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Project name */
    name: text('name').notNull(),

    /** Optional description */
    description: text('description'),

    /** Encrypted GitHub Personal Access Token */
    githubToken: text('github_token').notNull(),

    /** GitHub project owner (user or organization) */
    githubProjectOwner: text('github_project_owner').notNull(),

    /** GitHub project number */
    githubProjectNumber: integer('github_project_number').notNull(),

    /** Sync interval in minutes */
    syncIntervalMinutes: integer('sync_interval_minutes').default(5).notNull(),

    /** Last successful sync timestamp */
    lastSyncedAt: timestamp('last_synced_at'),

    /** Creation timestamp */
    createdAt: timestamp('created_at').defaultNow().notNull(),

    /** Last update timestamp */
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_project_owner_number').on(table.githubProjectOwner, table.githubProjectNumber),
    index('idx_project_last_synced').on(table.lastSyncedAt),
  ]
);

/**
 * Project repositories table - linked GitHub repositories
 */
export const projectRepos = pgTable(
  'project_repos',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to project */
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),

    /** Repository owner */
    owner: text('owner').notNull(),

    /** Repository name */
    repo: text('repo').notNull(),
  },
  (table) => [
    index('idx_project_repos_project').on(table.projectId),
    // Unique constraint: one repo per project
    uniqueIndex('idx_project_repos_unique').on(table.projectId, table.owner, table.repo),
  ]
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectRepo = typeof projectRepos.$inferSelect;
export type NewProjectRepo = typeof projectRepos.$inferInsert;
