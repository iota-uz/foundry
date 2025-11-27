/**
 * Start Actualize Workflow
 * POST /api/workflow/actualize/start - Start spec-code synchronization workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getWorkflowEngine } from '@/services/workflow';
import { ActualizeRequestSchema } from '@/schemas/api';

/**
 * POST /api/workflow/actualize/start - Start actualize workflow
 */
export async function POST(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectPath || !projectId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath or projectId query parameter',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = ActualizeRequestSchema.parse(body);

    // Generate session ID
    const sessionId = nanoid();

    // Prepare workflow data
    const workflowData: any = {
      projectId,
      projectPath,
      scope: parsed.scope,
      targetId: parsed.targetId,
      options: parsed.options || {},
    };

    // Start workflow
    const engine = getWorkflowEngine();

    // Execute workflow in background (async)
    engine.execute('actualize-workflow', sessionId, workflowData).catch((error) => {
      console.error('Actualize workflow failed:', error);
    });

    return NextResponse.json(
      {
        sessionId,
        status: 'running',
        message: 'Actualize workflow started',
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'WORKFLOW_ERROR',
          message: `Failed to start actualize workflow: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
