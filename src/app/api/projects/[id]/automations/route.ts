/**
 * Project Automations API
 *
 * GET /api/projects/:id/automations - List all automations for project
 *
 * Note: Mutations (POST) are handled via Server Actions
 * @see src/lib/actions/automations.ts
 */

import { NextResponse } from 'next/server';
import {
  AutomationRepository,
  ProjectRepository,
} from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';

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
