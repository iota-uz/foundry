/**
 * Workflow Execution API
 *
 * GET /api/workflows/executions/:id - Get execution by ID
 */

import { NextResponse } from 'next/server';
import { getExecution } from '@/lib/db/repositories/workflow.repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get execution by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const execution = await getExecution(id);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(execution);
  } catch (error) {
    console.error('Failed to get execution:', error);
    return NextResponse.json(
      { error: 'Failed to get execution' },
      { status: 500 }
    );
  }
}
