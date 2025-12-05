/**
 * Feature checklist API routes
 * GET /api/features/:id/checklist - Get implementation checklist
 * POST /api/features/:id/checklist - Regenerate checklist from acceptance criteria
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import type { ChecklistResponse } from '@/types/api/responses';

/**
 * GET /api/features/:id/checklist - Get implementation checklist
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

    const response: ChecklistResponse = {
      items: feature.checklist,
      progress: feature.checklistProgress,
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
          message: `Failed to get checklist: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features/:id/checklist - Regenerate checklist
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

    // TODO: Implement checklist regeneration from acceptance criteria
    // This would involve AI service to generate checklist
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Checklist regeneration not yet implemented',
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
          message: `Failed to regenerate checklist: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
