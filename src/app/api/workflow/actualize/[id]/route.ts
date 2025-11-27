/**
 * Get Actualize Workflow Status
 * GET /api/workflow/actualize/[id] - Get status of actualize workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowEngine } from '@/services/workflow';
import type { ActualizeResponse } from '@/types/api/responses';

/**
 * GET /api/workflow/actualize/[id] - Get actualize workflow status
 */
export async function GET(
  _request: NextRequest,
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

    // Build response based on workflow state
    const response: ActualizeResponse = {
      id: params.id,
      status: state.data.drift && state.data.drift.length > 0 ? 'drift_detected' : 'synced',
      drift: {
        specToCode: state.data.drift || [],
        codeToSpec: state.data.codeToSpec || [],
        schemaDrift: state.data.schemaDrift || [],
        apiDrift: state.data.apiDrift || [],
      },
      summary: {
        totalDriftItems: (state.data.drift || []).length,
        requiresAction: (state.data.drift || []).filter((d: any) => !d.autoFixable).length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'WORKFLOW_ERROR',
          message: `Failed to get actualize status: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
