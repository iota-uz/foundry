/**
 * GET /api/workflow/state - Get current workflow state
 */

import { NextRequest, NextResponse } from 'next/server';
import type { WorkflowStateResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';
import { getWorkflowEngine } from '@/services/workflow/engine-singleton';

export async function GET(request: NextRequest) {
  try {
    // Get sessionId from query params
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      const errorResponse = createErrorResponse(
        'VALIDATION_ERROR',
        'Session ID is required'
      );
      return NextResponse.json(errorResponse, { status: ErrorStatusCodes.VALIDATION_ERROR });
    }

    // Get WorkflowEngine instance and current state
    const workflowEngine = getWorkflowEngine();
    const state = await workflowEngine.getState(sessionId);

    if (!state) {
      const errorResponse = createErrorResponse(
        'NOT_FOUND',
        `Workflow session not found: ${sessionId}`
      );
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const totalTopics = Object.keys(state.topicQuestionCounts).length;
    const response: WorkflowStateResponse = {
      sessionId,
      workflowId: state.workflowId || 'cpo-phase',
      currentStepId: state.currentStepId,
      status: state.status || 'pending',
      progress: {
        topicsCompleted: state.currentTopicIndex,
        totalTopics,
        percentComplete: totalTopics ? Math.round((state.currentTopicIndex / totalTopics) * 100) : 0,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Failed to get workflow state:', error);
    const errorResponse = createErrorResponse(
      'WORKFLOW_ERROR',
      error instanceof Error ? error.message : 'Failed to get workflow state'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.WORKFLOW_ERROR });
  }
}
