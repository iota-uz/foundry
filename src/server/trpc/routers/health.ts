/**
 * Health Router
 *
 * Simple health check endpoint for monitoring.
 */

import { router, publicProcedure } from '../init';

export const healthRouter = router({
  /**
   * Health check
   * Replaces: GET /api/health
   */
  check: publicProcedure.query(() => {
    return {
      status: 'healthy' as const,
      timestamp: new Date(),
      runtime: 'bun' as const,
    };
  }),
});
