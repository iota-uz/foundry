/**
 * GitHub Credentials database schema
 *
 * Stores encrypted GitHub Personal Access Tokens (PATs) for user authentication.
 * Tokens are encrypted using AES-256-GCM before storage.
 */

import { pgTable, text, timestamp, uuid, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * GitHub credentials table - Encrypted GitHub PATs
 */
export const githubCredentials = pgTable(
  'github_credentials',
  {
    /** Unique identifier */
    id: uuid('id').primaryKey().defaultRandom(),

    /** Reference to user who owns this credential */
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    /** User-friendly name for this credential */
    name: text('name').notNull(),

    /** Encrypted GitHub Personal Access Token */
    encryptedToken: text('encrypted_token').notNull(),

    /** Creation timestamp */
    createdAt: timestamp('created_at').defaultNow().notNull(),

    /** Last update timestamp */
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Index for user lookups
    index('idx_github_credentials_user').on(table.userId),
    // Unique constraint: one name per user
    unique('uq_github_credentials_user_name').on(table.userId, table.name),
  ]
);

export type GitHubCredential = typeof githubCredentials.$inferSelect;
export type NewGitHubCredential = typeof githubCredentials.$inferInsert;
