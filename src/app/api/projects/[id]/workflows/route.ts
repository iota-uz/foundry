/**
 * Project Workflows API
 *
 * GET /api/projects/:projectId/workflows - List workflows for a project
 *
 * Note: Mutations (POST) are handled via Server Actions
 * @see src/lib/actions/workflows.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { listWorkflows } from '@/lib/db/repositories/workflow.repository';
import { getProject } from '@/lib/db/repositories/project.repository';
import { validateUuid, isValidationError } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * List all workflows for a project
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;

    // Validate projectId
    const validProjectId = validateUuid(projectId);
    if (isValidationError(validProjectId)) {
      return validProjectId;
    }

    // Check project exists
    const project = await getProject(validProjectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const workflows = await listWorkflows(validProjectId);
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Failed to list workflows:', error);
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    );
  }
}
