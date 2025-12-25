/**
 * Project Automations API
 *
 * GET /api/projects/:id/automations - List all automations for project
 * POST /api/projects/:id/automations - Create new automation
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
  createAutomationSchema,
} from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * List all automations for a project with their transitions
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    // Check if project exists
    const project = await ProjectRepository.getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get automations with transitions
    const automations = await AutomationRepository.listAutomationsWithTransitions(validId);

    return NextResponse.json({ data: automations });
  } catch (error) {
    console.error('Failed to list automations:', error);
    return NextResponse.json(
      { error: 'Failed to list automations' },
      { status: 500 }
    );
  }
}

/**
 * Create a new automation
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    // Validate request body
    const result = await validateBody(request, createAutomationSchema);
    if (isValidationError(result)) {
      return result;
    }

    // Check if project exists
    const project = await ProjectRepository.getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if workflow exists
    const workflow = await WorkflowRepository.getWorkflow(result.workflowId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Create automation
    const automation = await AutomationRepository.createAutomation({
      projectId: validId,
      name: result.name,
      triggerType: result.triggerType,
      triggerStatus: result.triggerStatus ?? null,
      buttonLabel: result.buttonLabel ?? null,
      workflowId: result.workflowId,
      enabled: result.enabled,
      priority: result.priority,
    });

    return NextResponse.json({ data: automation }, { status: 201 });
  } catch (error) {
    console.error('Failed to create automation:', error);
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    );
  }
}
