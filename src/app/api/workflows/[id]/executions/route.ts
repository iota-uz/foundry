/**
 * Workflow Executions List API
 *
 * GET /api/workflows/:id/executions - List all executions for a workflow
 */

import { NextResponse } from 'next/server';
import { listExecutions, getWorkflow } from '@/lib/db/repositories/workflow.repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * List all executions for a workflow
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify workflow exists
    const workflow = await getWorkflow(id);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const executions = await listExecutions(id);
    return NextResponse.json(executions);
  } catch (error) {
    console.error('Failed to list executions:', error);
    return NextResponse.json(
      { error: 'Failed to list executions' },
      { status: 500 }
    );
  }
}
