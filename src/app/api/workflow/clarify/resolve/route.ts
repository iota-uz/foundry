/**
 * POST /api/workflow/clarify/resolve - Resolve an ambiguity
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ClarifyResolveRequest } from '@/types/api/requests';
import type { SuccessResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';

// Validation schema
const clarifyResolveSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  ambiguityId: z.string().min(1, 'Ambiguity ID is required'),
  resolution: z.string().min(1, 'Resolution is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json() as ClarifyResolveRequest;
    const validatedData = clarifyResolveSchema.parse(body);

    // TODO: Get WorkflowEngine instance
    // const workflowEngine = getWorkflowEngine();

    // TODO: Resolve ambiguity and continue clarify workflow
    // await workflowEngine.resolveAmbiguity(
    //   validatedData.sessionId,
    //   validatedData.ambiguityId,
    //   validatedData.resolution
    // );

    console.log('Resolving ambiguity:', {
      sessionId: validatedData.sessionId,
      ambiguityId: validatedData.ambiguityId,
      resolution: validatedData.resolution,
    });

    // Return success response
    const response: SuccessResponse = {
      success: true,
      message: 'Ambiguity resolved successfully',
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

    console.error('Failed to resolve ambiguity:', error);
    const errorResponse = createErrorResponse(
      'CLARIFY_ERROR',
      error instanceof Error ? error.message : 'Failed to resolve ambiguity'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.CLARIFY_ERROR });
  }
}
