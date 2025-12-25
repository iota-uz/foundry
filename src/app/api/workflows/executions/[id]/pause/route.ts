/**
 * Pause Execution API
 *
 * POST /api/workflows/executions/:id/pause - Pause a running execution
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
 * Pause a running execution
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

    // Verify execution is running
    if (execution.status !== WorkflowStatus.Running) {
      return NextResponse.json(
        { error: `Cannot pause execution with status: ${execution.status}` },
        { status: 400 }
      );
    }

    // Update status to paused
    const updated = await updateExecution(validId, {
      status: WorkflowStatus.Paused,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      message: 'Execution paused',
    });
  } catch (error) {
    console.error('Failed to pause execution:', error);
    return NextResponse.json(
      { error: 'Failed to pause execution' },
      { status: 500 }
    );
  }
}
