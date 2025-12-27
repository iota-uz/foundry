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
import { runWorkflow, resumeWorkflow } from '@/lib/workflow-builder/workflow-runner';
import { getRailwayClient } from '@/lib/railway/client';
import { generateExecutionToken } from '@/lib/railway/auth';
import { getEnvVarOptional } from '@/lib/utils/env';

/** Default Docker image for container execution */
const DEFAULT_DOCKER_IMAGE = 'foundry/workflow-runner:latest';

/** Check if Railway is configured */
function isRailwayConfigured(): boolean {
  const token = getEnvVarOptional('RAILWAY_API_TOKEN', '');
  const projectId = getEnvVarOptional('RAILWAY_PROJECT_ID', '');
  const envId = getEnvVarOptional('RAILWAY_ENVIRONMENT_ID', '');
  return Boolean(token && projectId && envId);
}

/**
 * Schema for starting workflow execution
 */
const startExecutionSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID format'),
});

/**
 * Start a workflow execution
 *
 * If the workflow has a Docker image configured and Railway is available,
 * the workflow will run in a container. Otherwise, it runs in-process.
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

    // Determine execution mode: container vs in-process
    const dockerImage = workflow.dockerImage ?? null;
    const useContainerExecution = dockerImage !== null && isRailwayConfigured();

    // Create execution record
    const execution = await createExecution({
      workflowId,
      status: useContainerExecution ? WorkflowStatus.Pending : WorkflowStatus.Running,
      currentNode: firstNode.id,
      context: (workflow.initialContext as Record<string, unknown>) ?? {},
      nodeStates: {},
      conversationHistory: [],
    });

    if (useContainerExecution) {
      // Container execution via Railway
      try {
        const railway = getRailwayClient();
        const foundryApiUrl = getEnvVarOptional('FOUNDRY_API_URL', '');

        if (!foundryApiUrl) {
          throw new Error('FOUNDRY_API_URL environment variable is required for container execution');
        }

        // Generate JWT token for container authentication
        const token = await generateExecutionToken(execution.id, workflowId, '2h');

        // Create ephemeral Railway service
        const result = await railway.createService({
          name: `foundry-exec-${execution.id.slice(0, 8)}`,
          image: dockerImage ?? DEFAULT_DOCKER_IMAGE,
          variables: {
            FOUNDRY_API_URL: foundryApiUrl,
            FOUNDRY_EXECUTION_ID: execution.id,
            FOUNDRY_API_TOKEN: token,
          },
        });

        // Update execution with Railway IDs
        await updateExecution(execution.id, {
          status: WorkflowStatus.Running,
          railwayServiceId: result.serviceId,
        });

        console.log(`[execution] Started Railway service: ${result.serviceId}`);

      } catch (error) {
        console.error('[execution] Failed to start container:', error);

        // Fallback to in-process or mark as failed
        await updateExecution(execution.id, {
          status: WorkflowStatus.Failed,
          lastError: `Container startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          completedAt: new Date(),
        });

        throw new Error('Failed to start container execution');
      }

    } else {
      // In-process execution (legacy mode)
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
    }

    return {
      executionId: execution.id,
      status: execution.status,
      mode: useContainerExecution ? 'container' : 'in-process',
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

    // Resume the GraphEngine execution from checkpoint
    resumeWorkflow({ executionId }).catch((error) => {
      console.error('Workflow resume error:', error);
    });

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

    // If running in a container, delete the Railway service
    if (execution.railwayServiceId && isRailwayConfigured()) {
      try {
        const railway = getRailwayClient();
        await railway.deleteService(execution.railwayServiceId);
        console.log(`[execution] Deleted Railway service: ${execution.railwayServiceId}`);
      } catch (error) {
        console.error('[execution] Failed to delete Railway service:', error);
        // Continue with cancellation even if cleanup fails
      }
    }

    // Update status to failed (cancelled)
    const updated = await updateExecution(executionId, {
      status: WorkflowStatus.Failed,
      lastError: 'Execution cancelled by user',
      completedAt: new Date(),
      railwayServiceId: null,
      railwayDeploymentId: null,
    });

    return {
      id: updated.id,
      status: updated.status,
      message: 'Execution cancelled',
    };
  });
