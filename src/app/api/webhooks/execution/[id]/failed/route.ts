/**
 * Webhook: Execution Failed
 *
 * Called by container when workflow execution fails.
 * POST /api/webhooks/execution/:id/failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { getExecution, updateExecution } from '@/lib/db/repositories/workflow.repository';
import { broadcastExecutionEvent } from '@/lib/workflow-builder/execution-events';
import { getRailwayClient } from '@/lib/railway/client';
import { WorkflowStatus, SpecialNode } from '@/lib/graph/enums';
import type { NodeExecutionState } from '@/lib/db/schema/workflow-executions';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RequestBody {
  error?: string;
  nodeId?: string;
}

const logger = createLogger({ route: 'POST /api/webhooks/execution/:id/failed' });

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    await requireValidToken(authHeader, id);

    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { error: errorMessage, nodeId } = body;

    // Get current execution
    const execution = await getExecution(id);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Update node state if nodeId provided
    const nodeStates = execution.nodeStates as Record<string, NodeExecutionState>;
    let updatedNodeStates: Record<string, NodeExecutionState> = nodeStates;

    if (nodeId) {
      const existingNodeState = nodeStates[nodeId];
      const failedState: NodeExecutionState = {
        nodeId,
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: errorMessage ?? 'Unknown error',
        ...(existingNodeState?.startedAt && { startedAt: existingNodeState.startedAt }),
      };
      updatedNodeStates = {
        ...nodeStates,
        [nodeId]: failedState,
      };
    }

    // Update execution status
    await updateExecution(id, {
      status: 'failed',
      currentNode: SpecialNode.Error,
      lastError: errorMessage ?? 'Unknown error',
      nodeStates: updatedNodeStates,
      completedAt: new Date(),
    });

    // Broadcast to SSE subscribers
    const nodeState = nodeId ? { status: 'failed', error: errorMessage ?? 'Unknown error' } : undefined;
    broadcastExecutionEvent(id, {
      type: 'workflow_failed',
      status: WorkflowStatus.Failed,
      currentNodeId: SpecialNode.Error,
      ...(nodeId && { nodeId }),
      ...(nodeState && { nodeState }),
    });

    // Cleanup: Delete Railway service
    if (execution.railwayServiceId) {
      try {
        const railway = getRailwayClient();
        await railway.deleteService(execution.railwayServiceId);
        logger.info(`Deleted Railway service: ${execution.railwayServiceId}`);

        // Clear Railway IDs from execution
        await updateExecution(id, {
          railwayServiceId: null,
          railwayDeploymentId: null,
        });
      } catch (cleanupError) {
        // Log but don't fail the request
        logger.error('Failed to cleanup Railway service', { error: cleanupError });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error processing failed webhook', { error: error });

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
