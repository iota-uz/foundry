/**
 * Artifact history API route
 * GET /api/history/:type/:id - Get change history for artifact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHistoryService } from '@/services/core/history.service';
import type { HistoryResponse, FieldChange } from '@/types/api/responses';

/**
 * Parse changes object to FieldChange array
 */
function parseFieldChanges(changes: Record<string, unknown>): FieldChange[] {
  const fieldChanges: FieldChange[] = [];

  // If changes is already an array of field changes, return it
  if (Array.isArray(changes)) {
    return changes as FieldChange[];
  }

  // Otherwise, convert object format to field changes
  // Support format: { field: { from: ..., to: ... } }
  for (const [field, change] of Object.entries(changes)) {
    if (change && typeof change === 'object' && 'from' in change && 'to' in change) {
      fieldChanges.push({
        field,
        from: (change as { from: unknown }).from,
        to: (change as { to: unknown }).to,
      });
    } else {
      // If it's just a simple value change, represent as from: null, to: value
      fieldChanges.push({
        field,
        from: null,
        to: change,
      });
    }
  }

  return fieldChanges;
}

/**
 * GET /api/history/:type/:id - Get artifact history
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ type: string; id: string }> }
) {
  const params = await props.params;
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
    const actionMap: Record<string, 'create' | 'update' | 'delete'> = {
      created: 'create',
      updated: 'update',
      deleted: 'delete',
    };
    const entries = dbEntries.map((entry) => {
      // Parse changes field to FieldChange[]
      const changes = parseFieldChanges(entry.changes as Record<string, unknown>);

      return {
        id: entry.id,
        action: actionMap[entry.changeType] || 'update',
        actor: entry.changedBy,
        changes,
        timestamp: entry.createdAt,
      };
    });

    const response: HistoryResponse = {
      artifactType: params.type as 'feature' | 'entity' | 'endpoint' | 'component',
      artifactId: params.id,
      entries,
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
