/**
 * Workflow Executions List API
 *
 * GET /api/workflows/:id/executions - List all executions for a workflow
 */

import { NextResponse } from 'next/server';
import { listExecutions, getWorkflow } from '@/lib/db/repositories/workflow.repository';
import { validateUuid, isValidationError } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * List all executions for a workflow
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    // Verify workflow exists
    const workflow = await getWorkflow(validId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const executions = await listExecutions(validId);
    return NextResponse.json(executions);
  } catch (error) {
    console.error('Failed to list executions:', error);
    return NextResponse.json(
      { error: 'Failed to list executions' },
      { status: 500 }
    );
  }
}
