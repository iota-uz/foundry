/**
 * Feature tasks API routes
 * GET /api/features/:id/tasks - Get all tasks for feature
 * POST /api/features/:id/tasks/regenerate - Regenerate tasks from implementation plan
 * PATCH /api/features/:id/tasks/:taskId - Update task status (handled in dynamic route if needed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import type { TasksResponse } from '@/types/api/responses';

/**
 * GET /api/features/:id/tasks - Get all tasks for feature
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
    const feature = await specService.getFeature(
      projectPath,
      moduleSlug,
      params.id
    );

    const response: TasksResponse = {
      tasks: feature.tasks,
      progress: feature.taskProgress,
    };

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
          message: `Failed to get tasks: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features/:id/tasks - Regenerate tasks
 * Expects action=regenerate in the body
 */
export async function POST(request: NextRequest) {
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
    const { action } = body;

    if (action !== 'regenerate') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid action. Use action=regenerate',
          },
        },
        { status: 400 }
      );
    }

    // TODO: Implement task regeneration from implementation plan
    // This would involve AI service to generate tasks
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Task regeneration not yet implemented',
        },
      },
      { status: 501 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to regenerate tasks: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
