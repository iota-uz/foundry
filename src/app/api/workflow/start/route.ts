/**
 * POST /api/workflow/start - Start a new workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { StartWorkflowRequest } from '@/types/api/requests';
import type { WorkflowStateResponse } from '@/types/api/responses';
import { createErrorResponse, ErrorStatusCodes } from '@/types/api/errors';

// Validation schema
const startWorkflowSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  workflowId: z.enum(['cpo-phase', 'clarify-phase', 'cto-phase', 're-workflow', 'actualize-workflow']),
  mode: z.enum(['new', 'reverse']).optional(),
  initialPrompt: z.string().optional(),
  targetPath: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json() as StartWorkflowRequest;
    const validatedData = startWorkflowSchema.parse(body);

    // TODO: Get WorkflowEngine instance
    // const workflowEngine = getWorkflowEngine();

    // TODO: Start workflow execution
    // const sessionId = await workflowEngine.start(
    //   validatedData.workflowId,
    //   validatedData.projectId,
    //   {
    //     mode: validatedData.mode,
    //     initialPrompt: validatedData.initialPrompt,
    //     targetPath: validatedData.targetPath,
    //   }
    // );

    // Mock response for now
    const sessionId = `session-${Date.now()}`;
    const status = 'running';

    // Return workflow state
    const response: WorkflowStateResponse = {
      sessionId,
      workflowId: validatedData.workflowId,
      currentStepId: 'init',
      status,
      progress: {
        topicsCompleted: 0,
        totalTopics: 8,
        percentComplete: 0,
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

    console.error('Failed to start workflow:', error);
    const errorResponse = createErrorResponse(
      'WORKFLOW_ERROR',
      error instanceof Error ? error.message : 'Failed to start workflow'
    );
    return NextResponse.json(errorResponse, { status: ErrorStatusCodes.WORKFLOW_ERROR });
  }
}
