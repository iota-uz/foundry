/**
 * Single Automation API
 *
 * GET /api/projects/:id/automations/:automationId - Get automation by ID
 *
 * Note: Mutations (PUT/DELETE) are handled via Server Actions
 * @see src/lib/actions/automations.ts
 */

import { NextResponse } from 'next/server';
import {
  AutomationRepository,
  ProjectRepository,
} from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';

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
