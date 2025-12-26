'use server';

import { z } from 'zod';
import { actionClient } from './client';
import { createWorkflowSchema, updateWorkflowSchema } from '@/lib/validation';
import * as repo from '@/lib/db/repositories/workflow.repository';
import type { WorkflowNodeData, WorkflowEdgeData } from '@/lib/db/schema/workflows';

/**
 * Create a new workflow
 */
export const createWorkflowAction = actionClient
  .schema(createWorkflowSchema)
  .action(async ({ parsedInput }) => {
    const workflow = await repo.createWorkflow({
      name: parsedInput.name,
      description: parsedInput.description ?? null,
      nodes: parsedInput.nodes as WorkflowNodeData[],
      edges: parsedInput.edges as WorkflowEdgeData[],
      initialContext: parsedInput.initialContext ?? null,
    });
    return { workflow };
  });

/**
 * Schema for update workflow with id
 */
const updateWorkflowWithIdSchema = z
  .object({
    id: z.string().uuid('Invalid workflow ID format'),
  })
  .merge(updateWorkflowSchema);

/**
 * Update an existing workflow
 */
export const updateWorkflowAction = actionClient
  .schema(updateWorkflowWithIdSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;

    // Check if workflow exists
    const existing = await repo.getWorkflow(id);
    if (!existing) {
      throw new Error('Workflow not found');
    }

    // Build update data - only include defined values
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.nodes !== undefined) updateData.nodes = data.nodes;
    if (data.edges !== undefined) updateData.edges = data.edges;
    if (data.initialContext !== undefined) updateData.initialContext = data.initialContext;

    const workflow = await repo.updateWorkflow(id, updateData);
    return { workflow };
  });

/**
 * Schema for delete workflow
 */
const deleteWorkflowSchema = z.object({
  id: z.string().uuid('Invalid workflow ID format'),
});

/**
 * Delete a workflow
 */
export const deleteWorkflowAction = actionClient
  .schema(deleteWorkflowSchema)
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    // Check if workflow exists
    const existing = await repo.getWorkflow(id);
    if (!existing) {
      throw new Error('Workflow not found');
    }

    await repo.deleteWorkflow(id);
    return { success: true };
  });
