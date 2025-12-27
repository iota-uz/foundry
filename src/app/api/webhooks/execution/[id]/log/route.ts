/**
 * Webhook: Log Entry
 *
 * Called by container to append log entries during execution.
 * POST /api/webhooks/execution/:id/log
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { addLog } from '@/lib/db/repositories/workflow.repository';
import { broadcastExecutionEvent } from '@/lib/workflow-builder/execution-events';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RequestBody {
  level?: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  metadata?: Record<string, unknown>;
}

const logger = createLogger({ route: 'POST /api/webhooks/execution/:id/log' });

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    await requireValidToken(authHeader, id);

    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { level = 'info', message, nodeId, metadata } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();

    // Add log to database
    await addLog({
      executionId: id,
      level,
      message,
      nodeId: nodeId ?? null,
      timestamp: new Date(),
      metadata: metadata ?? null,
    });

    // Broadcast to SSE subscribers
    broadcastExecutionEvent(id, {
      type: 'log',
      log: {
        timestamp,
        level,
        message,
        ...(nodeId && { nodeId }),
        ...(metadata && { metadata }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error processing log webhook', { error: error });

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
