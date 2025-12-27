/**
 * tRPC HTTP Adapter
 *
 * Handles HTTP requests (GET for queries, POST for mutations).
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/root';
import { createContext } from '@/server/trpc/context';
import { createLogger } from '@/lib/logging';

const logger = createLogger({ route: 'tRPC /api/trpc' });

function onError({ path, error }: { path: string | undefined; error: Error }) {
  logger.error(`tRPC failed on ${path ?? '<no-path>'}`, { error: error });
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    ...(process.env.NODE_ENV === 'development' && { onError }),
  });

export { handler as GET, handler as POST };
