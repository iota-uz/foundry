/**
 * Single Automation API
 *
 * GET /api/projects/:id/automations/:automationId - Get automation by ID
 * PUT /api/projects/:id/automations/:automationId - Update automation
 * DELETE /api/projects/:id/automations/:automationId - Delete automation
 */

import { NextResponse } from 'next/server';
import {
  AutomationRepository,
  ProjectRepository,
  WorkflowRepository,
} from '@/lib/db/repositories';
import {
  validateBody,
  validateUuid,
  isValidationError,
  updateAutomationSchema,
} from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string; automationId: string }>;
}

/**
 * Get automation by ID with its transitions
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id, automationId } = await params;

    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const validAutomationId = validateUuid(automationId);
    if (validAutomationId instanceof NextResponse) {
      return validAutomationId;
    }

    // Check if project exists
    const project = await ProjectRepository.getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get automation with transitions
    const automation = await AutomationRepository.getAutomationWithTransitions(
      validAutomationId
    );
    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Verify automation belongs to project
    if (automation.projectId !== validId) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    return NextResponse.json({ data: automation });
  } catch (error) {
    console.error('Failed to get automation:', error);
    return NextResponse.json(
      { error: 'Failed to get automation' },
      { status: 500 }
    );
  }
}

/**
 * Update automation
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, automationId } = await params;

    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const validAutomationId = validateUuid(automationId);
    if (validAutomationId instanceof NextResponse) {
      return validAutomationId;
    }

    // Validate request body
    const result = await validateBody(request, updateAutomationSchema);
    if (isValidationError(result)) {
      return result;
    }

    // Check if project exists
    const project = await ProjectRepository.getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if automation exists and belongs to project
    const existing = await AutomationRepository.getAutomation(validAutomationId);
    if (!existing || existing.projectId !== validId) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // If workflowId is being updated, check if it exists
    if (result.workflowId) {
      const workflow = await WorkflowRepository.getWorkflow(result.workflowId);
      if (!workflow) {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }
    }

    // Build update data - only include defined values
    const updateData: Record<string, unknown> = {};
    if (result.name !== undefined) updateData.name = result.name;
    if (result.triggerType !== undefined) updateData.triggerType = result.triggerType;
    if (result.triggerStatus !== undefined) updateData.triggerStatus = result.triggerStatus;
    if (result.buttonLabel !== undefined) updateData.buttonLabel = result.buttonLabel;
    if (result.workflowId !== undefined) updateData.workflowId = result.workflowId;
    if (result.enabled !== undefined) updateData.enabled = result.enabled;
    if (result.priority !== undefined) updateData.priority = result.priority;

    // Update automation
    const automation = await AutomationRepository.updateAutomation(
      validAutomationId,
      updateData
    );

    return NextResponse.json({ data: automation });
  } catch (error) {
    console.error('Failed to update automation:', error);
    return NextResponse.json(
      { error: 'Failed to update automation' },
      { status: 500 }
    );
  }
}

/**
 * Delete automation (cascades to transitions)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, automationId } = await params;

    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const validAutomationId = validateUuid(automationId);
    if (validAutomationId instanceof NextResponse) {
      return validAutomationId;
    }

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(validAutomationId);
    if (!automation || automation.projectId !== validId) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Delete automation
    await AutomationRepository.deleteAutomation(validAutomationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete automation:', error);
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    );
  }
}
