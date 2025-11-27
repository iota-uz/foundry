/**
 * POST /api/workflow/retry - Retry failed step
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { RetryStepRequest } from '@/types/api/requests';
import type { SuccessResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';

// Validation schema
const retryStepRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  stepId: z.string().min(1, 'Step ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json() as RetryStepRequest;
    const validatedData = retryStepRequestSchema.parse(body);

    // TODO: Get WorkflowEngine instance
    // const workflowEngine = getWorkflowEngine();

    // TODO: Retry failed step
    // await workflowEngine.retryStep(
    //   validatedData.sessionId,
    //   validatedData.stepId
    // );

    console.log('Retrying step:', {
      sessionId: validatedData.sessionId,
      stepId: validatedData.stepId,
    });

    // Return success response
    const response: SuccessResponse = {
      success: true,
      message: 'Step retry initiated',
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

    console.error('Failed to retry step:', error);
    const errorResponse = createErrorResponse(
      'WORKFLOW_ERROR',
      error instanceof Error ? error.message : 'Failed to retry step'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.WORKFLOW_ERROR });
  }
}
