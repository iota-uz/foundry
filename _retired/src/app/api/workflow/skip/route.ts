/**
 * POST /api/workflow/skip - Skip current question
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SkipRequest } from '@/types/api/requests';
import type { SuccessResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';
import { getWorkflowEngine } from '@/services/workflow/engine';

// Validation schema
const skipRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json() as SkipRequest;
    const validatedData = skipRequestSchema.parse(body);

    // Get WorkflowEngine instance and skip question
    const workflowEngine = getWorkflowEngine();
    workflowEngine.skipQuestion(validatedData.sessionId, validatedData.questionId);

    // Return success response
    const response: SuccessResponse = {
      success: true,
      message: 'Question skipped successfully',
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

    console.error('Failed to skip question:', error);
    const errorResponse = createErrorResponse(
      'WORKFLOW_ERROR',
      error instanceof Error ? error.message : 'Failed to skip question'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.WORKFLOW_ERROR });
  }
}
