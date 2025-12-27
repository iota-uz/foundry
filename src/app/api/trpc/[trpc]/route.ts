/**
 * tRPC HTTP Adapter
 *
 * Handles HTTP requests (GET for queries, POST for mutations).
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/root';
import { createContext } from '@/server/trpc/context';

function onError({ path, error }: { path: string | undefined; error: Error }) {
  console.error(`tRPC failed on ${path ?? '<no-path>'}:`, error);
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
