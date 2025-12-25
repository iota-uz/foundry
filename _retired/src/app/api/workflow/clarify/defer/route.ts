/**
 * POST /api/workflow/clarify/defer - Defer ambiguity to CTO phase
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ClarifyDeferRequest } from '@/types/api/requests';
import type { SuccessResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';
import { getWorkflowEngine } from '@/services/workflow/engine-singleton';

// Validation schema
const clarifyDeferSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  ambiguityId: z.string().min(1, 'Ambiguity ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json() as ClarifyDeferRequest;
    const validatedData = clarifyDeferSchema.parse(body);

    // Get WorkflowEngine instance and defer ambiguity as answer
    const workflowEngine = getWorkflowEngine();
    workflowEngine.submitAnswer(
      validatedData.sessionId,
      validatedData.ambiguityId,
      'DEFER' // Use string marker instead of object
    );

    // Return success response
    const response: SuccessResponse = {
      success: true,
      message: 'Ambiguity deferred to CTO phase',
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

    console.error('Failed to defer ambiguity:', error);
    const errorResponse = createErrorResponse(
      'CLARIFY_ERROR',
      error instanceof Error ? error.message : 'Failed to defer ambiguity'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.CLARIFY_ERROR });
  }
}
