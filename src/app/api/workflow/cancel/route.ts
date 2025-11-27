/**
 * POST /api/workflow/cancel - Cancel current workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SuccessResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';
import { getWorkflowEngine } from '@/services/workflow/engine-singleton';

// Validation schema
const cancelWorkflowSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = cancelWorkflowSchema.parse(body);

    // Get WorkflowEngine instance and cancel workflow
    const workflowEngine = getWorkflowEngine();
    await workflowEngine.cancel(validatedData.sessionId);

    // Return success response
    const response: SuccessResponse = {
      success: true,
      message: 'Workflow cancelled successfully',
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

    console.error('Failed to cancel workflow:', error);
    const errorResponse = createErrorResponse(
      'WORKFLOW_ERROR',
      error instanceof Error ? error.message : 'Failed to cancel workflow'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.WORKFLOW_ERROR });
  }
}
