/**
 * Webhook: Node Started
 *
 * Called by container when a workflow node begins execution.
 * POST /api/webhooks/execution/:id/node-started
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
}

const logger = createLogger({ route: 'POST /api/webhooks/execution/:id/node-started' });

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    await requireValidToken(authHeader, id);

    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { nodeId } = body;

    if (!nodeId) {
      return NextResponse.json(
        { error: 'nodeId is required' },
        { status: 400 }
      );
    }

    // Get current execution to merge node states
    const execution = await getExecution(id);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Update node state
    const nodeStates = execution.nodeStates as Record<string, NodeExecutionState>;
    const updatedNodeStates: Record<string, NodeExecutionState> = {
      ...nodeStates,
      [nodeId]: {
        nodeId,
        status: 'running',
        startedAt: new Date().toISOString(),
      },
    };

    await updateExecution(id, {
      currentNode: nodeId,
      nodeStates: updatedNodeStates,
    });

    // Broadcast to SSE subscribers
    broadcastExecutionEvent(id, {
      type: 'node_started',
      nodeId,
      currentNodeId: nodeId,
      nodeState: { status: 'running' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error processing node-started webhook', { error: error });

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
