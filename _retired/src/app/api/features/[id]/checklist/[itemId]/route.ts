/**
 * Update Checklist Item API route
 * PATCH /api/features/[id]/checklist/[itemId] - Update checklist item
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { UpdateChecklistRequestSchema } from '@/schemas/api';

/**
 * PATCH /api/features/[id]/checklist/[itemId] - Update checklist item
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; itemId: string }> }
) {
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
    const parsed = UpdateChecklistRequestSchema.parse(body);

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    const feature = await specService.getFeature(
      projectPath,
      moduleSlug,
      params.id
    );

    // Find checklist item
    const itemIndex = feature.checklist.findIndex((item) => item.id === params.itemId);

    if (itemIndex === -1) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Checklist item not found',
          },
        },
        { status: 404 }
      );
    }

    // Update checklist item
    const updatedChecklist = [...feature.checklist];
    const currentItem = updatedChecklist[itemIndex];

    if (!currentItem) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Checklist item not found in array',
          },
        },
        { status: 500 }
      );
    }

    const updatedItem: typeof currentItem = {
      id: currentItem.id,
      criterion: currentItem.criterion,
      source: currentItem.source,
      verified: parsed.verified,
    };

    if (parsed.verified) {
      updatedItem.verifiedAt = new Date().toISOString();
      updatedItem.verifiedBy = 'user' as const;
    }

    if (parsed.notes !== undefined) {
      updatedItem.notes = parsed.notes;
    }

    updatedChecklist[itemIndex] = updatedItem;

    // Recalculate progress
    const verifiedCount = updatedChecklist.filter((item) => item.verified).length;
    const checklistProgress = {
      total: updatedChecklist.length,
      verified: verifiedCount,
      percentComplete: Math.round((verifiedCount / updatedChecklist.length) * 100),
    };

    // Update feature
    await specService.updateFeature(projectPath, moduleSlug, params.id, {
      checklist: updatedChecklist,
      checklistProgress,
    });

    return NextResponse.json({
      item: updatedChecklist[itemIndex],
      progress: checklistProgress,
    });
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
          message: `Failed to update checklist item: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
