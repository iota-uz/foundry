/**
 * Execution Router
 *
 * tRPC procedures for workflow execution management.
 * Replaces: /api/workflows/executions/*, /api/workflows/:id/executions, /api/workflows/executions/:id/stream
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../init';
import {
  getExecution,
  getWorkflow,
  listExecutions,
} from '@/lib/db/repositories/workflow.repository';
import { WorkflowStatus } from '@/lib/graph/enums';
import { subscriptionEmitter, type ExecutionEvent } from '../events';

export const executionRouter = router({
  /**
   * Get execution by ID
   * Replaces: GET /api/workflows/executions/:id
   */
  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const execution = await getExecution(input.id);
      if (!execution) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Execution not found',
        });
      }

      return execution;
    }),

  /**
   * List all executions for a workflow
   * Replaces: GET /api/workflows/:id/executions
   */
  listByWorkflow: publicProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ input }) => {
      const workflow = await getWorkflow(input.workflowId);
      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found',
        });
      }

      const executions = await listExecutions(input.workflowId);
      return executions;
    }),

  /**
   * Stream execution updates via SSE
   * Replaces: GET /api/workflows/executions/:id/stream
   *
   * Uses async generator pattern for tRPC subscriptions over SSE.
   * Clients should use httpSubscriptionLink to consume this.
   */
  stream: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .subscription(async function* (opts) {
      const { id } = opts.input;

      // Verify execution exists
      const execution = await getExecution(id);
      if (!execution) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Execution not found',
        });
      }

      // Send initial connected event with current state
      const initialEvent: ExecutionEvent = {
        type: 'connected',
        status: execution.status as WorkflowStatus,
        currentNodeId: execution.currentNode,
        nodeStates: execution.nodeStates as Record<string, { status?: string; output?: unknown; error?: string }>,
        context: execution.context as Record<string, unknown>,
      };
      yield initialEvent;

      // If already completed or failed, send final event and exit
      if (
        execution.status === WorkflowStatus.Completed ||
        execution.status === WorkflowStatus.Failed
      ) {
        const finalEvent: ExecutionEvent = {
          type: execution.status === WorkflowStatus.Completed
            ? 'workflow_completed'
            : 'workflow_failed',
        };
        yield finalEvent;
        return;
      }

      // Listen for execution events
      for await (const [executionId, event] of subscriptionEmitter.toIterable(
        'execution',
        { signal: opts.signal }
      )) {
        // Only emit events for this execution
        if (executionId === id) {
          yield event;

          // Exit if workflow completed or failed
          if (
            event.type === 'workflow_completed' ||
            event.type === 'workflow_failed'
          ) {
            return;
          }
        }
      }
    }),
});
