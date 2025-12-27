/**
 * tRPC Initialization
 *
 * Creates the tRPC instance with context, transformer, and procedure builders.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from './context';

/**
 * Initialize tRPC with context and configuration
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
  /**
   * SSE configuration for subscriptions
   * Enables Server-Sent Events instead of WebSockets
   */
  sse: {
    ping: {
      enabled: true,
      intervalMs: 10_000, // Keep-alive ping every 10 seconds
    },
    client: {
      reconnectAfterInactivityMs: 15_000, // Reconnect after 15 seconds of inactivity
    },
  },
});

/**
 * Router builder
 */
export const router = t.router;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

/**
 * Middleware builder for custom middleware
 */
export const middleware = t.middleware;

/**
 * Merge routers utility
 */
export const mergeRouters = t.mergeRouters;
