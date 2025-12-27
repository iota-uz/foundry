/**
 * tRPC Vanilla Client
 *
 * For use outside of React components (e.g., server actions, API routes).
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@/server/trpc/root';

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser - use relative URL
    return '';
  }

  // Server - use absolute URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Vanilla tRPC client for server-side usage
 *
 * Usage:
 * ```ts
 * const result = await trpcClient.health.check.query();
 * ```
 */
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
