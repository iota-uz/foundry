'use server';

import { z } from 'zod';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';
import { actionClient } from './client';
import {
  getWorkflow,
  createExecution,
  getExecution,
  updateExecution,
} from '@/lib/db/repositories/workflow.repository';
import { WorkflowStatus } from '@/lib/graph/enums';
import { runWorkflow } from '@/lib/workflow-builder/workflow-runner';

/**
 * Schema for starting workflow execution
 */
const startExecutionSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID format'),
});

/**
 * Start a workflow execution
 */
export const startExecutionAction = actionClient
  .schema(startExecutionSchema)
  .action(async ({ parsedInput }) => {
    const { workflowId } = parsedInput;

    // Verify workflow exists
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Get the first node as entry point
    const nodes = workflow.nodes as Node<WorkflowNodeData>[];
    const firstNode = nodes[0];
    if (!firstNode) {
      throw new Error('Workflow has no nodes');
    }

    // Create execution record
    const execution = await createExecution({
      workflowId,
      status: WorkflowStatus.Running,
      currentNode: firstNode.id,
      context: (workflow.initialContext as Record<string, unknown>) ?? {},
      nodeStates: {},
      conversationHistory: [],
    });

    // Run workflow asynchronously (don't await - let it run in background)
    runWorkflow({
      executionId: execution.id,
      workflowId,
      workflowName: workflow.name,
      nodes: nodes,
      edges: workflow.edges as Edge[],
      initialContext: (workflow.initialContext as Record<string, unknown>) ?? {},
    }).catch((error) => {
      console.error('Workflow execution error:', error);
    });

    return {
      executionId: execution.id,
      status: execution.status,
    };
  });

/**
 * Schema for execution control actions
 */
const executionIdSchema = z.object({
  executionId: z.string().uuid('Invalid execution ID format'),
});

/**
 * Pause a running execution
 */
export const pauseExecutionAction = actionClient
  .schema(executionIdSchema)
  .action(async ({ parsedInput }) => {
    const { executionId } = parsedInput;

    // Get current execution
    const execution = await getExecution(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    // Verify execution is running
    if (execution.status !== WorkflowStatus.Running) {
      throw new Error(`Cannot pause execution with status: ${execution.status}`);
    }

    // Update status to paused
    const updated = await updateExecution(executionId, {
      status: WorkflowStatus.Paused,
    });

    return {
      id: updated.id,
      status: updated.status,
      message: 'Execution paused',
    };
  });

/**
 * Resume a paused execution
 */
export const resumeExecutionAction = actionClient
  .schema(executionIdSchema)
  .action(async ({ parsedInput }) => {
    const { executionId } = parsedInput;

    // Get current execution
    const execution = await getExecution(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    // Verify execution is paused
    if (execution.status !== WorkflowStatus.Paused) {
      throw new Error(`Cannot resume execution with status: ${execution.status}`);
    }

    // Update status to running
    const updated = await updateExecution(executionId, {
      status: WorkflowStatus.Running,
    });

    // TODO: Actually resume the GraphEngine execution
    // This would trigger the engine to continue from currentNode

    return {
      id: updated.id,
      status: updated.status,
      message: 'Execution resumed',
    };
  });

/**
 * Cancel a running or paused execution
 */
export const cancelExecutionAction = actionClient
  .schema(executionIdSchema)
  .action(async ({ parsedInput }) => {
    const { executionId } = parsedInput;

    // Get current execution
    const execution = await getExecution(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    // Verify execution is cancellable
    const cancellableStatuses = [
      WorkflowStatus.Running,
      WorkflowStatus.Paused,
      WorkflowStatus.Pending,
    ];
    if (!cancellableStatuses.includes(execution.status as WorkflowStatus)) {
      throw new Error(`Cannot cancel execution with status: ${execution.status}`);
    }

    // Update status to failed (cancelled)
    const updated = await updateExecution(executionId, {
      status: WorkflowStatus.Failed,
      lastError: 'Execution cancelled by user',
      completedAt: new Date(),
    });

    // TODO: Signal the GraphEngine to abort current node execution

    return {
      id: updated.id,
      status: updated.status,
      message: 'Execution cancelled',
    };
  });
