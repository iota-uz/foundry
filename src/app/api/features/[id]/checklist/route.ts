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

    // Get the feature to ensure it exists and has acceptance criteria
    const fileService = getFileService();
    const specService = getSpecService(fileService);
    const feature = await specService.getFeature(
      projectPath,
      moduleSlug,
      params.id
    );

    // Check if feature has acceptance criteria
    if (!feature.business?.acceptanceCriteria || feature.business.acceptanceCriteria.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Feature has no acceptance criteria to generate checklist from',
          },
        },
        { status: 400 }
      );
    }

    // Generate checklist items from acceptance criteria
    // For now, we'll do a simple 1:1 mapping (no AI needed for basic implementation)
    // In the future, this could use AI to break down complex criteria into smaller checklist items
    const { generateId } = await import('@/lib/utils/id');
    const checklist = feature.business.acceptanceCriteria.map((criterion, index) => {
      const item: {
        id: string;
        criterion: string;
        source: string;
        verified: boolean;
        verifiedAt?: string;
        verifiedBy?: 'user' | 'ai';
        notes?: string;
      } = {
        id: generateId('check'),
        criterion,
        source: `business.acceptanceCriteria.${index}`,
        verified: false,
      };
      return item;
    });

    // Update feature with new checklist
    feature.checklist = checklist;
    feature.checklistProgress = {
      total: checklist.length,
      verified: 0,
      percentComplete: 0,
    };

    // Save the updated feature
    await specService.updateFeature(projectPath, moduleSlug, params.id, feature);

    const response: ChecklistResponse = {
      items: checklist,
      progress: feature.checklistProgress,
    };

    return NextResponse.json(response);
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
