/**
 * Issue Executions API
 *
 * GET /api/projects/:id/issues/:issueId/executions - List executions for a specific issue
 */

import { NextResponse } from 'next/server';
import {
  ProjectRepository,
  IssueMetadataRepository,
} from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string; issueId: string }>;
}

/**
 * List all executions for a specific issue
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id, issueId } = await params;

    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const validIssueId = validateUuid(issueId);
    if (validIssueId instanceof NextResponse) {
      return validIssueId;
    }

    // Check if project exists
    const project = await ProjectRepository.getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if issue metadata exists and belongs to project
    const issue = await IssueMetadataRepository.getIssueMetadata(validIssueId);
    if (!issue || issue.projectId !== validId) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Get executions for this issue
    const executions = await IssueMetadataRepository.listExecutions(validIssueId);

    return NextResponse.json({ data: executions });
  } catch (error) {
    console.error('Failed to list issue executions:', error);
    return NextResponse.json(
      { error: 'Failed to list issue executions' },
      { status: 500 }
    );
  }
}
