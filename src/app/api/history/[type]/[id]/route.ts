/**
 * Artifact history API route
 * GET /api/history/:type/:id - Get change history for artifact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHistoryService } from '@/services/core/history.service';
import type { HistoryResponse } from '@/types/api/responses';

/**
 * GET /api/history/:type/:id - Get artifact history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath query parameter',
          },
        },
        { status: 400 }
      );
    }

    // Validate artifact type
    const validTypes = ['feature', 'entity', 'endpoint', 'component'];
    if (!validTypes.includes(params.type)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid artifact type. Must be one of: ${validTypes.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    const historyService = getHistoryService();
    const dbEntries = await historyService.getHistory(
      params.type as 'feature' | 'entity' | 'endpoint' | 'component',
      params.id
    );

    // Map DB entries to API format
    const entries = dbEntries.map((entry) => ({
      id: entry.id,
      action: entry.changeType,
      actor: entry.changedBy,
      changes: [], // TODO: Parse entry.changes to FieldChange[]
      timestamp: entry.createdAt,
    }));

    const response: HistoryResponse = {
      artifactType: params.type as 'feature' | 'entity' | 'endpoint' | 'component',
      artifactId: params.id,
      entries: entries as any, // Type assertion since mapping is correct
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Artifact history not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get history: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
