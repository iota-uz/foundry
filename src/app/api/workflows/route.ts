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
import type { WorkflowNodeData, WorkflowEdgeData } from '@/lib/db/schema';

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
    const body = await request.json() as {
      name: string;
      description?: string;
      nodes: WorkflowNodeData[];
      edges: WorkflowEdgeData[];
      initialContext?: Record<string, unknown>;
    };

    const workflow = await createWorkflow({
      name: body.name,
      description: body.description ?? null,
      nodes: body.nodes,
      edges: body.edges,
      initialContext: body.initialContext ?? null,
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
