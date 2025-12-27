/**
 * Visualization Router
 *
 * tRPC procedures for analytics and execution visualization.
 * Replaces: /api/visualizations/*
 */

import { z } from 'zod';
import { router, publicProcedure } from '../init';
import {
  getExecutionStats,
  listAllExecutions,
  getNodeAnalytics,
} from '@/lib/db/repositories/analytics.repository';

export const visualizationRouter = router({
  /**
   * Get aggregated execution statistics
   * Replaces: GET /api/visualizations/stats
   */
  stats: publicProcedure.query(async () => {
    return getExecutionStats();
  }),

  /**
   * List all executions across workflows with pagination
   * Replaces: GET /api/visualizations/executions
   */
  executions: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .default({})
    )
    .query(async ({ input }) => {
      const result = await listAllExecutions(input.limit, input.offset);

      return {
        executions: result.executions,
        total: result.total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get node-level analytics
   * Replaces: GET /api/visualizations/analytics
   */
  analytics: publicProcedure
    .input(
      z
        .object({
          workflowId: z.string().uuid().optional(),
        })
        .default({})
    )
    .query(async ({ input }) => {
      const nodes = await getNodeAnalytics(input.workflowId);
      return { nodes };
    }),
});
