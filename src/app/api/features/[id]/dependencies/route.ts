/**
 * Feature dependencies API routes
 * GET /api/features/:id/dependencies - Get dependency graph
 * POST /api/features/:id/dependencies - Add dependency
 * DELETE /api/features/:id/dependencies/:depId - Remove dependency (would need separate route)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { AddFeatureDependencyRequestSchema } from '@/schemas/api';

/**
 * GET /api/features/:id/dependencies - Get dependency graph
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    const feature = await specService.getFeature(
      projectPath,
      moduleSlug,
      params.id
    );

    // Return dependencies array
    return NextResponse.json({ dependencies: feature.dependencies });
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
          message: `Failed to get dependencies: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features/:id/dependencies - Add dependency
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    const parsed = AddFeatureDependencyRequestSchema.parse(body);

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    const feature = await specService.getFeature(
      projectPath,
      moduleSlug,
      params.id
    );

    // Check for circular dependency
    if (parsed.dependsOnFeatureId === feature.id) {
      return NextResponse.json(
        {
          error: {
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Cannot add self as dependency',
          },
        },
        { status: 400 }
      );
    }

    // Check if dependency already exists
    if (feature.dependencies.includes(parsed.dependsOnFeatureId)) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_ID',
            message: 'Dependency already exists',
          },
        },
        { status: 400 }
      );
    }

    // Add dependency
    const updatedDependencies = [...feature.dependencies, parsed.dependsOnFeatureId];
    await specService.updateFeature(projectPath, moduleSlug, params.id, {
      dependencies: updatedDependencies,
    });

    return NextResponse.json({ dependencies: updatedDependencies }, { status: 201 });
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
          message: `Failed to add dependency: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE would be handled in a separate [depId] route
 * /api/features/[id]/dependencies/[depId]/route.ts
 */
