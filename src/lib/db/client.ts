/**
 * PostgreSQL database client using Drizzle ORM
 *
 * Replaces the previous SQLite implementation.
 * Uses the `postgres` package for Bun compatibility.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

/**
 * Get the database instance (singleton)
 *
 * @returns Drizzle database instance with schema
 */
export function getDatabase() {
  if (db) {
    return db;
  }

  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === '') {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
        'Run `bun db:up` to start PostgreSQL and set DATABASE_URL=postgres://foundry:foundry@localhost:5432/foundry'
    );
  }

  // Create postgres client
  queryClient = postgres(connectionString);

  // Create Drizzle instance with schema for type safety
  db = drizzle(queryClient, { schema });

  return db;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (queryClient) {
    await queryClient.end();
    queryClient = null;
    db = null;
  }
}

/**
 * Get the raw postgres client for advanced queries
 */
export function getQueryClient() {
  if (!queryClient) {
    getDatabase(); // Initialize if not already
  }
  return queryClient!;
}

/**
 * Execute a query within a transaction
 */
export async function transaction<T>(
  fn: (tx: Parameters<Parameters<ReturnType<typeof getDatabase>['transaction']>[0]>[0]) => Promise<T>
): Promise<T> {
  const database = getDatabase();
  return database.transaction(fn);
}

/**
 * Database instance type for type inference
 */
export type Database = ReturnType<typeof getDatabase>;
