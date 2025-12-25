/**
 * Execution Stream API
 *
 * GET /api/workflows/executions/:id/stream - SSE stream for real-time execution updates
 */

import { getExecution } from '@/lib/db/repositories/workflow.repository';
import { WorkflowStatus } from '@/lib/graph/enums';
import {
  subscribeToExecution,
  unsubscribeFromExecution,
} from '@/lib/workflow-builder/execution-events';
import { validateUuid, isValidationError } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * SSE endpoint for execution updates
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const validId = validateUuid(id);
  if (isValidationError(validId)) {
    return new Response(JSON.stringify({ error: 'Invalid UUID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify execution exists
  const execution = await getExecution(validId);
  if (!execution) {
    return new Response(JSON.stringify({ error: 'Execution not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      subscribeToExecution(validId, controller);

      // Send initial state
      const initialEvent = {
        type: 'connected',
        status: execution.status,
        currentNodeId: execution.currentNode,
        nodeStates: execution.nodeStates,
        context: execution.context,
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`));

      // If execution is already completed or failed, close after sending state
      if (
        execution.status === WorkflowStatus.Completed ||
        execution.status === WorkflowStatus.Failed
      ) {
        // Send final event
        const finalEvent = {
          type: execution.status === WorkflowStatus.Completed
            ? 'workflow_completed'
            : 'workflow_failed',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`));
      }
    },
    cancel() {
      if (controllerRef) {
        unsubscribeFromExecution(validId, controllerRef);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
