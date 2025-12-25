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
import {
  validateBody,
  validateUuid,
  isValidationError,
  updateWorkflowSchema,
} from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get a workflow by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    const workflow = await getWorkflow(validId);

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
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    const result = await validateBody(request, updateWorkflowSchema);
    if (isValidationError(result)) {
      return result;
    }

    type NodeType = { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> };
    type EdgeType = { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; data?: Record<string, unknown> };

    const workflow = await updateWorkflow(validId, {
      ...(result.name && { name: result.name }),
      ...(result.description !== undefined && { description: result.description }),
      ...(result.nodes && { nodes: result.nodes as NodeType[] }),
      ...(result.edges && { edges: result.edges as EdgeType[] }),
      ...(result.initialContext !== undefined && {
        initialContext: result.initialContext,
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
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    await deleteWorkflow(validId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
