/**
 * Single Workflow API
 *
 * GET /api/workflows/:id - Get a workflow
 * PUT /api/workflows/:id - Update a workflow
 * DELETE /api/workflows/:id - Delete a workflow
 */

import { NextResponse } from 'next/server';
import {
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '@/lib/db/repositories/workflow.repository';
import type { WorkflowNodeData, WorkflowEdgeData } from '@/lib/db/schema';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get a workflow by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workflow = await getWorkflow(id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to get workflow:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow' },
      { status: 500 }
    );
  }
}

/**
 * Update a workflow
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      name?: string;
      description?: string;
      nodes?: WorkflowNodeData[];
      edges?: WorkflowEdgeData[];
      initialContext?: Record<string, unknown>;
    };

    const workflow = await updateWorkflow(id, {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.nodes && { nodes: body.nodes }),
      ...(body.edges && { edges: body.edges }),
      ...(body.initialContext !== undefined && {
        initialContext: body.initialContext,
      }),
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to update workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

/**
 * Delete a workflow
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteWorkflow(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
