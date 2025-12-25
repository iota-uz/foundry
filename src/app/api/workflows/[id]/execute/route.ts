/**
 * Workflow Execution API
 *
 * POST /api/workflows/:id/execute - Start a new execution
 */

import { NextResponse } from 'next/server';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';
import {
  getWorkflow,
  createExecution,
} from '@/lib/db/repositories/workflow.repository';
import { WorkflowStatus } from '@/lib/graph/enums';
import { runWorkflow } from '@/lib/workflow-builder/workflow-runner';
import { validateUuid, isValidationError } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Start a workflow execution
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    // Verify workflow exists
    const workflow = await getWorkflow(validId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get the first node as entry point
    const nodes = workflow.nodes as Node<WorkflowNodeData>[];
    const firstNode = nodes[0];
    if (!firstNode) {
      return NextResponse.json(
        { error: 'Workflow has no nodes' },
        { status: 400 }
      );
    }

    // Create execution record
    const execution = await createExecution({
      workflowId: validId,
      status: WorkflowStatus.Running,
      currentNode: firstNode.id,
      context: (workflow.initialContext as Record<string, unknown>) ?? {},
      nodeStates: {},
      conversationHistory: [],
    });

    // Run workflow asynchronously (don't await - let it run in background)
    runWorkflow({
      executionId: execution.id,
      workflowId: validId,
      workflowName: workflow.name,
      nodes: nodes,
      edges: workflow.edges as Edge[],
      initialContext: (workflow.initialContext as Record<string, unknown>) ?? {},
    }).catch((error) => {
      console.error('Workflow execution error:', error);
    });

    return NextResponse.json({
      executionId: execution.id,
      status: execution.status,
    });
  } catch (error) {
    console.error('Failed to start execution:', error);
    return NextResponse.json(
      { error: 'Failed to start execution' },
      { status: 500 }
    );
  }
}
