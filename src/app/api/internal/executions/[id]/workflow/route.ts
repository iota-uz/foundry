/**
 * Internal API: Workflow Download
 *
 * Returns workflow definition for container execution.
 * GET /api/internal/executions/:id/workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { getExecution, getWorkflow } from '@/lib/db/repositories/workflow.repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    await requireValidToken(authHeader, id);

    // Get execution
    const execution = await getExecution(id);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Get workflow
    const workflow = await getWorkflow(execution.workflowId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Return workflow data needed for execution
    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      initialContext: execution.context,
    });
  } catch (error) {
    console.error('[internal:workflow] Error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
