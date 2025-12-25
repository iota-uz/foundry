/**
 * Single Transition API
 *
 * PUT /api/projects/:id/automations/:automationId/transitions/:transitionId - Update transition
 * DELETE /api/projects/:id/automations/:automationId/transitions/:transitionId - Delete transition
 */

import { NextResponse } from 'next/server';
import { AutomationRepository } from '@/lib/db/repositories';
import {
  validateBody,
  validateUuid,
  isValidationError,
  updateTransitionSchema,
} from '@/lib/validation';

interface RouteParams {
  params: Promise<{
    id: string;
    automationId: string;
    transitionId: string;
  }>;
}

/**
 * Update a transition
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, automationId, transitionId } = await params;

    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const validAutomationId = validateUuid(automationId);
    if (validAutomationId instanceof NextResponse) {
      return validAutomationId;
    }

    const validTransitionId = validateUuid(transitionId);
    if (validTransitionId instanceof NextResponse) {
      return validTransitionId;
    }

    // Validate request body
    const result = await validateBody(request, updateTransitionSchema);
    if (isValidationError(result)) {
      return result;
    }

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(validAutomationId);
    if (!automation || automation.projectId !== validId) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Check if transition exists and belongs to automation
    const existing = await AutomationRepository.getTransitions(validAutomationId);
    const transitionExists = existing.some((t) => t.id === validTransitionId);
    if (!transitionExists) {
      return NextResponse.json({ error: 'Transition not found' }, { status: 404 });
    }

    // Build update data - only include defined values
    const updateData: Record<string, unknown> = {};
    if (result.condition !== undefined) updateData.condition = result.condition;
    if (result.customExpression !== undefined)
      updateData.customExpression = result.customExpression;
    if (result.nextStatus !== undefined) updateData.nextStatus = result.nextStatus;
    if (result.priority !== undefined) updateData.priority = result.priority;

    // Update transition
    const transition = await AutomationRepository.updateTransition(
      validTransitionId,
      updateData
    );

    return NextResponse.json({ data: transition });
  } catch (error) {
    console.error('Failed to update transition:', error);
    return NextResponse.json(
      { error: 'Failed to update transition' },
      { status: 500 }
    );
  }
}

/**
 * Delete a transition
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, automationId, transitionId } = await params;

    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const validAutomationId = validateUuid(automationId);
    if (validAutomationId instanceof NextResponse) {
      return validAutomationId;
    }

    const validTransitionId = validateUuid(transitionId);
    if (validTransitionId instanceof NextResponse) {
      return validTransitionId;
    }

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(validAutomationId);
    if (!automation || automation.projectId !== validId) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Check if transition exists and belongs to automation
    const existing = await AutomationRepository.getTransitions(validAutomationId);
    const transitionExists = existing.some((t) => t.id === validTransitionId);
    if (!transitionExists) {
      return NextResponse.json({ error: 'Transition not found' }, { status: 404 });
    }

    // Delete transition
    await AutomationRepository.removeTransition(validTransitionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete transition:', error);
    return NextResponse.json(
      { error: 'Failed to delete transition' },
      { status: 500 }
    );
  }
}
