/**
 * POST /api/workflow/answer - Submit answer to current question
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { AnswerRequest } from '@/types/api/requests';
import type { SuccessResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';
import { getWorkflowEngine } from '@/services/workflow/engine';

// Validation schema
const answerRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.union([
    z.string(),
    z.array(z.string()),
    z.number(),
    z.boolean(),
    z.record(z.any()),
  ]),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json() as AnswerRequest;
    const validatedData = answerRequestSchema.parse(body);

    // Get WorkflowEngine instance
    const workflowEngine = getWorkflowEngine();

    // Submit answer and continue workflow
    workflowEngine.submitAnswer(
      validatedData.sessionId,
      validatedData.questionId,
      validatedData.answer as string | string[] | number | boolean
    );

    // Return success response
    const response: SuccessResponse = {
      success: true,
      message: 'Answer submitted successfully',
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

    console.error('Failed to submit answer:', error);
    const errorResponse = createErrorResponse(
      'WORKFLOW_ERROR',
      error instanceof Error ? error.message : 'Failed to submit answer'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.WORKFLOW_ERROR });
  }
}
