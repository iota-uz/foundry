/**
 * Feature detail API routes
 * GET /api/features/:id - Get feature with all artifacts
 * PUT /api/features/:id - Update feature
 * DELETE /api/features/:id - Delete feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { UpdateFeatureRequestSchema } from '@/schemas/api';
import type { FeatureResponse } from '@/types/api/responses';

/**
 * GET /api/features/:id - Get feature with all artifacts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const moduleSlug = request.nextUrl.searchParams.get('moduleSlug');

    if (!projectPath || !moduleSlug) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath or moduleSlug query parameter',
          },
        },
        { status: 400 }
      );
    }

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    // params.id is the feature slug
    const feature = await specService.getFeature(
      projectPath,
      moduleSlug,
      params.id
    );

    const response: FeatureResponse = { feature };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Feature not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get feature: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/features/:id - Update feature
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const moduleSlug = request.nextUrl.searchParams.get('moduleSlug');

    if (!projectPath || !moduleSlug) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath or moduleSlug query parameter',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = UpdateFeatureRequestSchema.parse(body);

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.description !== undefined) updates.description = parsed.description;
    if (parsed.status !== undefined) updates.status = parsed.status;
    if (parsed.business !== undefined) updates.business = parsed.business;

    const feature = await specService.updateFeature(
      projectPath,
      moduleSlug,
      params.id,
      updates
    );

    const response: FeatureResponse = { feature };
    return NextResponse.json(response);
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

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Feature not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to update feature: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/:id - Delete feature
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const moduleSlug = request.nextUrl.searchParams.get('moduleSlug');

    if (!projectPath || !moduleSlug) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath or moduleSlug query parameter',
          },
        },
        { status: 400 }
      );
    }

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    await specService.deleteFeature(projectPath, moduleSlug, params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Feature not found',
          },
        },
        { status: 404 }
      );
    }

    if (message.includes('Cannot delete feature with dependencies')) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to delete feature: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
