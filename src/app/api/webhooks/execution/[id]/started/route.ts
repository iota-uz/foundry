/**
 * Webhook: Execution Started
 *
 * Called by container when workflow execution begins.
 * POST /api/webhooks/execution/:id/started
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { updateExecution } from '@/lib/db/repositories/workflow.repository';
import { broadcastExecutionEvent } from '@/lib/workflow-builder/execution-events';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    await requireValidToken(authHeader, id);

    // Update execution status
    await updateExecution(id, {
      status: 'running',
    });

    // Broadcast to SSE subscribers
    broadcastExecutionEvent(id, {
      type: 'execution_started',
      status: 'Running' as import('@/lib/graph/enums').WorkflowStatus,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[webhook:started] Error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
