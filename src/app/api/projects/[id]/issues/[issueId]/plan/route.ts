/**
 * Issue Plan API
 *
 * GET /api/projects/:id/issues/:issueId/plan - Get current plan state
 */

import { NextResponse } from 'next/server';
import {
  ProjectRepository,
  IssueMetadataRepository,
  WorkflowRepository,
} from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';
import type { GetPlanResponse } from '@/lib/planning/types';

interface RouteParams {
  params: Promise<{ id: string; issueId: string }>;
}

/**
 * Get current plan state for an issue
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

    // Return plan content from issue metadata
    const response: GetPlanResponse = {
      planContent: issue.planContent as any || null,
    };

    // If there's a planning session, try to get workflow status
    if (issue.planContent && typeof issue.planContent === 'object' && 'sessionId' in issue.planContent) {
      const sessionId = (issue.planContent as any).sessionId;
      
      // Try to get the latest execution for this issue
      const latestExecution = await IssueMetadataRepository.getLatestExecution(validIssueId);
      if (latestExecution?.workflowExecutionId) {
        const execution = await WorkflowRepository.getExecution(latestExecution.workflowExecutionId);
        if (execution) {
          response.sessionId = sessionId;
          response.workflowStatus = execution.status;
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get plan:', error);
    return NextResponse.json(
      { error: 'Failed to get plan' },
      { status: 500 }
    );
  }
}
