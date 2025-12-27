/**
 * Single Project Workflow API
 *
 * GET /api/projects/:projectId/workflows/:id - Get a workflow
 *
 * Note: Mutations (PUT/DELETE) are handled via Server Actions
 * @see src/lib/actions/workflows.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowByProject } from '@/lib/db/repositories/workflow.repository';
import { getProject } from '@/lib/db/repositories/project.repository';
import { validateUuid, isValidationError } from '@/lib/validation';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string; workflowId: string }>;
}

const logger = createLogger({ route: 'GET /api/projects/:id/workflows/:workflowId' });

/**
 * Get a workflow by ID within a project
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, workflowId } = await params;

    // Validate projectId
    const validProjectId = validateUuid(projectId);
    if (isValidationError(validProjectId)) {
      return validProjectId;
    }

    // Validate workflow id
    const validId = validateUuid(workflowId);
    if (isValidationError(validId)) {
      return validId;
    }

    // Check project exists
    const project = await getProject(validProjectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get workflow, ensuring it belongs to this project
    const workflow = await getWorkflowByProject(validId, validProjectId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    logger.error('Failed to get workflow', { error: error });
    return NextResponse.json(
      { error: 'Failed to get workflow' },
      { status: 500 }
    );
  }
}
