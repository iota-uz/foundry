/**
 * Webhook: Node Completed
 *
 * Called by container when a workflow node finishes execution.
 * POST /api/webhooks/execution/:id/node-completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { getExecution, updateExecution } from '@/lib/db/repositories/workflow.repository';
import { broadcastExecutionEvent } from '@/lib/workflow-builder/execution-events';
import type { NodeExecutionState } from '@/lib/db/schema/workflow-executions';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RequestBody {
  nodeId: string;
  context?: Record<string, unknown>;
  nextNode?: string;
  result?: unknown;
}

const logger = createLogger({ route: 'POST /api/webhooks/execution/:id/node-completed' });

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    await requireValidToken(authHeader, id);

    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { nodeId, context, nextNode, result } = body;

    if (!nodeId) {
      return NextResponse.json(
        { error: 'nodeId is required' },
        { status: 400 }
      );
    }

    // Get current execution to merge states
    const execution = await getExecution(id);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Update node state
    const nodeStates = execution.nodeStates as Record<string, NodeExecutionState>;
    const existingNodeState = nodeStates[nodeId] ?? { nodeId, status: 'pending' };
    const updatedNodeStates: Record<string, NodeExecutionState> = {
      ...nodeStates,
      [nodeId]: {
        ...existingNodeState,
        status: 'completed',
        completedAt: new Date().toISOString(),
        result,
      },
    };

    // Merge context if provided
    const updatedContext = context
      ? { ...(execution.context as Record<string, unknown>), ...context }
      : execution.context;

    await updateExecution(id, {
      currentNode: nextNode ?? execution.currentNode,
      context: updatedContext,
      nodeStates: updatedNodeStates,
    });

    // Broadcast to SSE subscribers
    broadcastExecutionEvent(id, {
      type: 'node_completed',
      nodeId,
      currentNodeId: nextNode ?? execution.currentNode,
      context: updatedContext as Record<string, unknown>,
      nodeState: { status: 'completed', output: result },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error processing node-completed webhook', { error: error });

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
