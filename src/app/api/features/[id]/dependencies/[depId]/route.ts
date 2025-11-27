/**
 * Remove Feature Dependency API route
 * DELETE /api/features/[id]/dependencies/[depId] - Remove dependency
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';

/**
 * DELETE /api/features/[id]/dependencies/[depId] - Remove dependency
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; depId: string } }
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
    const feature = await specService.getFeature(
      projectPath,
      moduleSlug,
      params.id
    );

    // Check if dependency exists
    if (!feature.dependencies.includes(params.depId)) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Dependency not found',
          },
        },
        { status: 404 }
      );
    }

    // Remove dependency
    const updatedDependencies = feature.dependencies.filter(
      (id) => id !== params.depId
    );

    await specService.updateFeature(projectPath, moduleSlug, params.id, {
      dependencies: updatedDependencies,
    });

    return NextResponse.json({
      success: true,
      dependencies: updatedDependencies,
    });
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
          message: `Failed to remove dependency: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
