/**
 * Workflows API
 *
 * GET /api/workflows - List all workflows
 * POST /api/workflows - Create a new workflow
 */

import { NextResponse } from 'next/server';
import {
  listWorkflows,
  createWorkflow,
} from '@/lib/db/repositories/workflow.repository';
import {
  validateBody,
  isValidationError,
  createWorkflowSchema,
} from '@/lib/validation';

/**
 * List all workflows
 */
export async function GET() {
  try {
    const workflows = await listWorkflows();
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Failed to list workflows:', error);
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    );
  }
}

/**
 * Create a new workflow
 */
export async function POST(request: Request) {
  try {
    const result = await validateBody(request, createWorkflowSchema);
    if (isValidationError(result)) {
      return result;
    }

    const workflow = await createWorkflow({
      name: result.name,
      description: result.description ?? null,
      nodes: result.nodes as { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }[],
      edges: result.edges as { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; data?: Record<string, unknown> }[],
      initialContext: result.initialContext ?? null,
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Failed to create workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
