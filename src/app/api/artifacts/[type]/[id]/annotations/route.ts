/**
 * Annotations API routes
 * GET /api/artifacts/[type]/[id]/annotations - List annotations
 * POST /api/artifacts/[type]/[id]/annotations - Create annotation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import {
  getAnnotations,
  createAnnotation,
  type Annotation
} from '@/lib/db/queries/annotations';
import { CreateAnnotationRequestSchema } from '@/schemas/api';
import type { AnnotationsResponse } from '@/types/api/responses';

/**
 * GET /api/artifacts/[type]/[id]/annotations - List annotations for an artifact
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

    // Map type to artifact type
    const artifactType = mapArtifactType(params.type);
    if (!artifactType) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid artifact type: ${params.type}`,
          },
        },
        { status: 400 }
      );
    }

    const annotations = getAnnotations(artifactType, params.id);

    const response: AnnotationsResponse = {
      annotations: annotations.map(toApiAnnotation),
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get annotations: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/artifacts/[type]/[id]/annotations - Create annotation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectPath || !projectId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath or projectId query parameter',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = CreateAnnotationRequestSchema.parse(body);

    // Map type to artifact type
    const artifactType = mapArtifactType(params.type);
    if (!artifactType) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid artifact type: ${params.type}`,
          },
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const annotation: Annotation = {
      id: nanoid(),
      projectId,
      artifactType,
      artifactId: params.id,
      artifactPath: parsed.fieldPath,
      content: parsed.content,
      author: 'user',
      annotationType: 'comment',
      status: 'open',
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };

    createAnnotation(annotation);

    return NextResponse.json(
      { annotation: toApiAnnotation(annotation) },
      { status: 201 }
    );
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
          message: `Failed to create annotation: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Map URL type to database artifact type
 */
function mapArtifactType(
  urlType: string
): 'feature' | 'schema' | 'api' | 'component' | null {
  switch (urlType) {
    case 'features':
      return 'feature';
    case 'schema':
    case 'entities':
      return 'schema';
    case 'openapi':
    case 'graphql':
    case 'endpoints':
      return 'api';
    case 'components':
      return 'component';
    default:
      return null;
  }
}

/**
 * Convert DB annotation to API annotation
 */
function toApiAnnotation(annotation: Annotation): AnnotationsResponse['annotations'][0] {
  const result: AnnotationsResponse['annotations'][0] = {
    id: annotation.id,
    artifactType: mapDbToApiArtifactType(annotation.artifactType),
    artifactId: annotation.artifactId,
    fieldPath: annotation.artifactPath || '',
    content: annotation.content,
    author: annotation.author,
    status: annotation.status === 'resolved' ? 'resolved' : 'open',
    createdAt: annotation.createdAt,
  };

  if (annotation.resolvedAt) {
    result.resolvedAt = annotation.resolvedAt;
  }

  return result;
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
