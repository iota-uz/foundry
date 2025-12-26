/**
 * Webhook: Execution Completed
 *
 * Called by container when workflow execution succeeds.
 * POST /api/webhooks/execution/:id/completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { getExecution, updateExecution } from '@/lib/db/repositories/workflow.repository';
import { broadcastExecutionEvent } from '@/lib/workflow-builder/execution-events';
import { getRailwayClient } from '@/lib/railway/client';
import { WorkflowStatus, SpecialNode } from '@/lib/graph/enums';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RequestBody {
  context?: Record<string, unknown>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    await requireValidToken(authHeader, id);

    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { context } = body;

    // Get current execution
    const execution = await getExecution(id);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Update execution status
    const updatedContext = context
      ? { ...(execution.context as Record<string, unknown>), ...context }
      : execution.context;

    await updateExecution(id, {
      status: 'completed',
      currentNode: SpecialNode.End,
      context: updatedContext,
      completedAt: new Date(),
    });

    // Broadcast to SSE subscribers
    broadcastExecutionEvent(id, {
      type: 'workflow_completed',
      status: WorkflowStatus.Completed,
      currentNodeId: SpecialNode.End,
      context: updatedContext as Record<string, unknown>,
    });

    // Cleanup: Delete Railway service
    if (execution.railwayServiceId) {
      try {
        const railway = getRailwayClient();
        await railway.deleteService(execution.railwayServiceId);
        console.log(`[webhook:completed] Deleted Railway service: ${execution.railwayServiceId}`);

        // Clear Railway IDs from execution
        await updateExecution(id, {
          railwayServiceId: null,
          railwayDeploymentId: null,
        });
      } catch (cleanupError) {
        // Log but don't fail the request
        console.error('[webhook:completed] Failed to cleanup Railway service:', cleanupError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[webhook:completed] Error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
