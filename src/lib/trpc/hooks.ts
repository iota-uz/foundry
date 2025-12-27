/**
 * tRPC React Hooks
 *
 * Typed hooks for React components using tRPC.
 */

import { createTRPCReact } from '@trpc/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/root';

/**
 * tRPC React client with typed hooks
 *
 * Usage:
 * ```tsx
 * const { data } = trpc.health.check.useQuery();
 * ```
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Type helpers for inferring input/output types from router
 */
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
