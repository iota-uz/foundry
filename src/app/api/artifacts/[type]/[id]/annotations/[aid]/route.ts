/**
 * Individual annotation API routes
 * GET /api/artifacts/[type]/[id]/annotations/[aid] - Get annotation
 * PATCH /api/artifacts/[type]/[id]/annotations/[aid] - Update annotation
 * DELETE /api/artifacts/[type]/[id]/annotations/[aid] - Delete annotation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase } from '@/lib/db/client';
import {
  updateAnnotation,
  deleteAnnotation,
  type Annotation
} from '@/lib/db/queries/annotations';
import { UpdateAnnotationRequestSchema } from '@/schemas/api';

/**
 * GET /api/artifacts/[type]/[id]/annotations/[aid] - Get annotation
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { type: string; id: string; aid: string } }
) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM annotations WHERE id = ?');
    const row = stmt.get(params.aid) as string;

    if (!row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Annotation not found',
          },
        },
        { status: 404 }
      );
    }

    const annotation = rowToAnnotation(row);

    return NextResponse.json({ annotation: toApiAnnotation(annotation) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get annotation: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/artifacts/[type]/[id]/annotations/[aid] - Update annotation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { type: string; id: string; aid: string } }
) {
  try {
    const body = await request.json();
    const parsed = UpdateAnnotationRequestSchema.parse(body);

    // Check if annotation exists
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM annotations WHERE id = ?');
    const row = stmt.get(params.aid) as string;

    if (!row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Annotation not found',
          },
        },
        { status: 404 }
      );
    }

    // Build updates
    const updates: Partial<Annotation> = {};
    if (parsed.content !== undefined) {
      updates.content = parsed.content;
    }
    if (parsed.status !== undefined) {
      updates.status = parsed.status;
    }

    updateAnnotation(params.aid, updates);

    // Get updated annotation
    const updatedRow = stmt.get(params.aid) as string;
    const annotation = rowToAnnotation(updatedRow);

    return NextResponse.json({ annotation: toApiAnnotation(annotation) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to update annotation: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/artifacts/[type]/[id]/annotations/[aid] - Delete annotation
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { type: string; id: string; aid: string } }
) {
  try {
    // Check if annotation exists
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM annotations WHERE id = ?');
    const row = stmt.get(params.aid) as string;

    if (!row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Annotation not found',
          },
        },
        { status: 404 }
      );
    }

    deleteAnnotation(params.aid);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to delete annotation: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Convert database row to Annotation
 */
function rowToAnnotation(row: unknown): Annotation {
  return {
    id: row.id,
    projectId: row.project_id,
    artifactType: row.artifact_type,
    artifactId: row.artifact_id,
    artifactPath: row.artifact_path,
    content: row.content,
    author: row.author,
    annotationType: row.annotation_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

/**
 * Convert DB annotation to API annotation
 */
function toApiAnnotation(annotation: Annotation): unknown {
  return {
    id: annotation.id,
    artifactType: mapDbToApiArtifactType(annotation.artifactType),
    artifactId: annotation.artifactId,
    fieldPath: annotation.artifactPath || '',
    content: annotation.content,
    author: annotation.author,
    status: annotation.status === 'resolved' ? 'resolved' : 'open',
    createdAt: annotation.createdAt,
    resolvedAt: annotation.resolvedAt || undefined,
  };
}

/**
 * Map DB artifact type to API artifact type
 */
function mapDbToApiArtifactType(
  dbType: 'feature' | 'schema' | 'api' | 'component'
): 'feature' | 'entity' | 'endpoint' | 'component' {
  switch (dbType) {
    case 'feature':
      return 'feature';
    case 'schema':
      return 'entity';
    case 'api':
      return 'endpoint';
    case 'component':
      return 'component';
  }
}
