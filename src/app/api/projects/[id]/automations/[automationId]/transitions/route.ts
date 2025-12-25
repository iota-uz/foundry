/**
 * Automation Transitions API
 *
 * GET /api/projects/:id/automations/:automationId/transitions - List transitions
 * POST /api/projects/:id/automations/:automationId/transitions - Create transition
 */

import { NextResponse } from 'next/server';
import { AutomationRepository } from '@/lib/db/repositories';
import {
  validateBody,
  validateUuid,
  isValidationError,
  createTransitionSchema,
} from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string; automationId: string }>;
}

/**
 * List all transitions for an automation
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

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(validAutomationId);
    if (!automation || automation.projectId !== validId) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Get transitions
    const transitions = await AutomationRepository.getTransitions(validAutomationId);

    return NextResponse.json({ data: transitions });
  } catch (error) {
    console.error('Failed to list transitions:', error);
    return NextResponse.json(
      { error: 'Failed to list transitions' },
      { status: 500 }
    );
  }
}

/**
 * Create a new transition for an automation
 */
export async function POST(request: Request, { params }: RouteParams) {
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
    const result = await validateBody(request, createTransitionSchema);
    if (isValidationError(result)) {
      return result;
    }

    // Check if automation exists and belongs to project
    const automation = await AutomationRepository.getAutomation(validAutomationId);
    if (!automation || automation.projectId !== validId) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Create transition
    const transition = await AutomationRepository.addTransition(validAutomationId, {
      condition: result.condition,
      customExpression: result.customExpression ?? null,
      nextStatus: result.nextStatus,
      priority: result.priority,
    });

    return NextResponse.json({ data: transition }, { status: 201 });
  } catch (error) {
    console.error('Failed to create transition:', error);
    return NextResponse.json(
      { error: 'Failed to create transition' },
      { status: 500 }
    );
  }
}
