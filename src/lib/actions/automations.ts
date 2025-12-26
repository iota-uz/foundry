'use server';

import { z } from 'zod';
import { actionClient } from './client';
import { createAutomationSchema, updateAutomationSchema } from '@/lib/validation';
import {
  AutomationRepository,
  ProjectRepository,
  WorkflowRepository,
} from '@/lib/db/repositories';

/**
 * Schema for create automation with project id
 */
const createAutomationWithProjectIdSchema = z
  .object({
    projectId: z.string().uuid('Invalid project ID format'),
  })
  .and(createAutomationSchema);

/**
 * Create a new automation for a project
 */
export const createAutomationAction = actionClient
  .schema(createAutomationWithProjectIdSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, ...data } = parsedInput;

    // Check if project exists
    const project = await ProjectRepository.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if workflow exists
    const workflow = await WorkflowRepository.getWorkflow(data.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Create automation
    const automation = await AutomationRepository.createAutomation({
      projectId,
      name: data.name,
      triggerType: data.triggerType,
      triggerStatus: data.triggerStatus ?? null,
      buttonLabel: data.buttonLabel ?? null,
      workflowId: data.workflowId,
      enabled: data.enabled,
      priority: data.priority,
    });

    return { automation };
  });

/**
 * Schema for update automation with ids
 */
const updateAutomationWithIdsSchema = z
  .object({
    projectId: z.string().uuid('Invalid project ID format'),
    automationId: z.string().uuid('Invalid automation ID format'),
  })
  .merge(updateAutomationSchema);

/**
 * Update an existing automation
 */
export const updateAutomationAction = actionClient
  .schema(updateAutomationWithIdsSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, automationId, ...data } = parsedInput;

    // Check if project exists
    const project = await ProjectRepository.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if automation exists and belongs to project
    const existing = await AutomationRepository.getAutomation(automationId);
    if (!existing || existing.projectId !== projectId) {
      throw new Error('Automation not found');
    }

    // If workflowId is being updated, check if it exists
    if (data.workflowId !== undefined && data.workflowId !== null && data.workflowId !== '') {
      const workflow = await WorkflowRepository.getWorkflow(data.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }
    }

    // Build update data - only include defined values
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
    if (data.triggerStatus !== undefined) updateData.triggerStatus = data.triggerStatus;
    if (data.buttonLabel !== undefined) updateData.buttonLabel = data.buttonLabel;
    if (data.workflowId !== undefined) updateData.workflowId = data.workflowId;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.priority !== undefined) updateData.priority = data.priority;

    // Update automation
    const automation = await AutomationRepository.updateAutomation(automationId, updateData);

    return { automation };
  });

/**
 * Schema for delete automation
 */
const deleteAutomationSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  automationId: z.string().uuid('Invalid automation ID format'),
});

/**
 * Delete an automation
 */
export const deleteAutomationAction = actionClient
  .schema(deleteAutomationSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, automationId } = parsedInput;

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(automationId);
    if (!automation || automation.projectId !== projectId) {
      throw new Error('Automation not found');
    }

    // Delete automation
    await AutomationRepository.deleteAutomation(automationId);

    return { success: true };
  });

// ============================================================================
// Transition Actions
// ============================================================================

/**
 * Schema for create transition with ids
 */
const createTransitionWithIdsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  automationId: z.string().uuid('Invalid automation ID format'),
  condition: z.enum(['success', 'failure', 'custom']),
  customExpression: z.string().min(1).optional(),
  nextStatus: z.string().min(1).max(255),
  priority: z.number().int().default(0),
});

/**
 * Create a new transition for an automation
 */
export const createTransitionAction = actionClient
  .schema(createTransitionWithIdsSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, automationId, ...data } = parsedInput;

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(automationId);
    if (!automation || automation.projectId !== projectId) {
      throw new Error('Automation not found');
    }

    // Create transition
    const transition = await AutomationRepository.addTransition(automationId, {
      condition: data.condition,
      customExpression: data.customExpression ?? null,
      nextStatus: data.nextStatus,
      priority: data.priority,
    });

    return { transition };
  });

/**
 * Schema for update transition with ids
 */
const updateTransitionWithIdsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  automationId: z.string().uuid('Invalid automation ID format'),
  transitionId: z.string().uuid('Invalid transition ID format'),
  condition: z.enum(['success', 'failure', 'custom']).optional(),
  customExpression: z.string().min(1).nullable().optional(),
  nextStatus: z.string().min(1).max(255).optional(),
  priority: z.number().int().optional(),
});

/**
 * Update an existing transition
 */
export const updateTransitionAction = actionClient
  .schema(updateTransitionWithIdsSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, automationId, transitionId, ...data } = parsedInput;

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(automationId);
    if (!automation || automation.projectId !== projectId) {
      throw new Error('Automation not found');
    }

    // Check if transition exists and belongs to automation
    const existing = await AutomationRepository.getTransitions(automationId);
    const transitionExists = existing.some((t) => t.id === transitionId);
    if (!transitionExists) {
      throw new Error('Transition not found');
    }

    // Build update data - only include defined values
    const updateData: Record<string, unknown> = {};
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.customExpression !== undefined) updateData.customExpression = data.customExpression;
    if (data.nextStatus !== undefined) updateData.nextStatus = data.nextStatus;
    if (data.priority !== undefined) updateData.priority = data.priority;

    // Update transition
    const transition = await AutomationRepository.updateTransition(transitionId, updateData);

    return { transition };
  });

/**
 * Schema for delete transition
 */
const deleteTransitionSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  automationId: z.string().uuid('Invalid automation ID format'),
  transitionId: z.string().uuid('Invalid transition ID format'),
});

/**
 * Delete a transition
 */
export const deleteTransitionAction = actionClient
  .schema(deleteTransitionSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, automationId, transitionId } = parsedInput;

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(automationId);
    if (!automation || automation.projectId !== projectId) {
      throw new Error('Automation not found');
    }

    // Check if transition exists and belongs to automation
    const existing = await AutomationRepository.getTransitions(automationId);
    const transitionExists = existing.some((t) => t.id === transitionId);
    if (!transitionExists) {
      throw new Error('Transition not found');
    }

    // Delete transition
    await AutomationRepository.removeTransition(transitionId);

    return { success: true };
  });
