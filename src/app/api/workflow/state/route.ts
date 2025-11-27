/**
 * GET /api/workflow/state - Get current workflow state
 */

import { NextRequest, NextResponse } from 'next/server';
import type { WorkflowStateResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';

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

    // TODO: Get WorkflowEngine instance
    // const workflowEngine = getWorkflowEngine();

    // TODO: Get current workflow state
    // const state = await workflowEngine.getState(sessionId);

    console.log('Getting workflow state for session:', sessionId);

    // Mock response
    const response: WorkflowStateResponse = {
      sessionId,
      workflowId: 'cpo-phase',
      currentStepId: 'question-step-1',
      status: 'waiting_user',
      currentTopic: {
        id: 'product-vision',
        name: 'Product Vision',
        questionIndex: 3,
        totalQuestions: 5,
      },
      progress: {
        topicsCompleted: 1,
        totalTopics: 8,
        percentComplete: 12.5,
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
