/**
 * Apply Actualize Changes
 * POST /api/workflow/actualize/[id]/apply - Apply suggested changes from actualize workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkflowEngine } from '@/services/workflow';

const ApplyChangesRequestSchema = z.object({
  changes: z.array(z.string()), // Array of drift item IDs to apply
  applyAll: z.boolean().optional(),
});

/**
 * POST /api/workflow/actualize/[id]/apply - Apply changes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const engine = getWorkflowEngine();
    const statePromise = engine.getState(params.id);
    const state = await statePromise;

    if (!state) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Actualize session not found',
          },
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = ApplyChangesRequestSchema.parse(body);

    // Get drift items to apply
    const drift = state.data.drift || [];
    const itemsToApply = parsed.applyAll
      ? drift.filter((d: any) => d.autoFixable)
      : drift.filter((d: any) => parsed.changes.includes(d.id));

    if (itemsToApply.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid changes to apply',
          },
        },
        { status: 400 }
      );
    }

    // Update workflow state with changes to apply
    state.data.changesToApply = itemsToApply;

    // Resume workflow to apply changes
    // The workflow should handle applying changes based on state.data.changesToApply
    await engine.resume(params.id);

    return NextResponse.json(
      {
        success: true,
        appliedCount: itemsToApply.length,
        message: `Applied ${itemsToApply.length} changes`,
      },
      { status: 200 }
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
          code: 'WORKFLOW_ERROR',
          message: `Failed to apply changes: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
