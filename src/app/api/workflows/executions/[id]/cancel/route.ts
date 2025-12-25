/**
 * Cancel Execution API
 *
 * POST /api/workflows/executions/:id/cancel - Cancel a running or paused execution
 */

import { NextResponse } from 'next/server';
import {
  getExecution,
  updateExecution,
} from '@/lib/db/repositories/workflow.repository';
import { WorkflowStatus } from '@/lib/graph/enums';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Cancel a running or paused execution
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get current execution
    const execution = await getExecution(id);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Verify execution is cancellable
    const cancellableStatuses = [WorkflowStatus.Running, WorkflowStatus.Paused, WorkflowStatus.Pending];
    if (!cancellableStatuses.includes(execution.status as WorkflowStatus)) {
      return NextResponse.json(
        { error: `Cannot cancel execution with status: ${execution.status}` },
        { status: 400 }
      );
    }

    // Update status to failed (cancelled)
    const updated = await updateExecution(id, {
      status: WorkflowStatus.Failed,
      lastError: 'Execution cancelled by user',
      completedAt: new Date(),
    });

    // TODO: Signal the GraphEngine to abort current node execution

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      message: 'Execution cancelled',
    });
  } catch (error) {
    console.error('Failed to cancel execution:', error);
    return NextResponse.json(
      { error: 'Failed to cancel execution' },
      { status: 500 }
    );
  }
}
