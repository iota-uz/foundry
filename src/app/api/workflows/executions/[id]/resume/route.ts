/**
 * Resume Execution API
 *
 * POST /api/workflows/executions/:id/resume - Resume a paused execution
 */

import { NextResponse } from 'next/server';
import {
  getExecution,
  updateExecution,
} from '@/lib/db/repositories/workflow.repository';
import { WorkflowStatus } from '@/lib/graph/enums';
import { validateUuid, isValidationError } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Resume a paused execution
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    // Get current execution
    const execution = await getExecution(validId);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Verify execution is paused
    if (execution.status !== WorkflowStatus.Paused) {
      return NextResponse.json(
        { error: `Cannot resume execution with status: ${execution.status}` },
        { status: 400 }
      );
    }

    // Update status to running
    const updated = await updateExecution(validId, {
      status: WorkflowStatus.Running,
    });

    // TODO: Actually resume the GraphEngine execution
    // This would trigger the engine to continue from currentNode

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      message: 'Execution resumed',
    });
  } catch (error) {
    console.error('Failed to resume execution:', error);
    return NextResponse.json(
      { error: 'Failed to resume execution' },
      { status: 500 }
    );
  }
}
