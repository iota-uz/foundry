/**
 * tRPC Context
 *
 * Provides request-scoped dependencies (database, session) to all procedures.
 */

import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { getDatabase, type Database } from '@/lib/db/client';
import { auth } from '@/lib/auth/config';
import type { Session } from 'next-auth';

export interface Context {
  db: Database;
  session: Session | null;
  headers: Headers | null;
}

/**
 * Create context for HTTP requests
 */
export async function createContext(
  opts?: FetchCreateContextFnOptions
): Promise<Context> {
  const session = await auth();

  return {
    db: getDatabase(),
    session,
    headers: opts?.req.headers ?? null,
  };
}

/**
 * Create context for WebSocket connections
 * Note: Will be implemented when adding WebSocket support
 */
export async function createWSContext(_opts: { req: Request }): Promise<Context> {
  const session = await auth();

  return {
    db: getDatabase(),
    session,
    headers: null,
  };
}
