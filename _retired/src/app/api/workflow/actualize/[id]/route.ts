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
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    const drift = (state.data.drift || []) as ActualizeResponse['drift']['specToCode'];
    const codeToSpec = (state.data.codeToSpec || []) as ActualizeResponse['drift']['codeToSpec'];
    const schemaDrift = (state.data.schemaDrift || []) as ActualizeResponse['drift']['schemaDrift'];
    const apiDrift = (state.data.apiDrift || []) as ActualizeResponse['drift']['apiDrift'];

    const response: ActualizeResponse = {
      id: params.id,
      status: drift.length > 0 ? 'drift_detected' : 'synced',
      drift: {
        specToCode: drift,
        codeToSpec,
        schemaDrift,
        apiDrift,
      },
      summary: {
        totalDriftItems: drift.length,
        requiresAction: drift.length, // All drift items require action
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
