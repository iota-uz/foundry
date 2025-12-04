/**
 * POST /api/workflow/resume - Resume paused workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { WorkflowStateResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';
import { getWorkflowEngine } from '@/services/workflow/engine-singleton';

// Validation schema
const resumeWorkflowSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = resumeWorkflowSchema.parse(body);

    // Get WorkflowEngine instance and resume workflow (runs in background)
    const workflowEngine = getWorkflowEngine();
    workflowEngine.resume(validatedData.sessionId).catch((error) => {
      console.error(`Failed to resume workflow ${validatedData.sessionId}:`, error);
    });

    // Get current state
    const state = await workflowEngine.getState(validatedData.sessionId);

    const totalTopics = state ? Object.keys(state.topicQuestionCounts).length : 8;
    const response: WorkflowStateResponse = {
      sessionId: validatedData.sessionId,
      workflowId: (state?.workflowId as string) || 'cpo-phase',
      currentStepId: state?.currentStepId || 'unknown',
      status: 'running',
      progress: {
        topicsCompleted: state?.currentTopicIndex || 0,
        totalTopics,
        percentComplete: state ? Math.round((state.currentTopicIndex / totalTopics) * 100) : 0,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request data',
        { validationErrors: error.errors }
      );
      return NextResponse.json(errorResponse, { status: ErrorStatusCodes.VALIDATION_ERROR });
    }

    console.error('Failed to resume workflow:', error);
    const errorResponse = createErrorResponse(
      'WORKFLOW_ERROR',
      error instanceof Error ? error.message : 'Failed to resume workflow'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.WORKFLOW_ERROR });
  }
}
