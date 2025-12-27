/**
 * Cancel Planning API
 *
 * POST /api/projects/:id/issues/:issueId/plan/cancel - Cancel planning workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ProjectRepository,
  IssueMetadataRepository,
} from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';
import { createLogger } from '@/lib/logging';
import type { PlanContent } from '@/lib/planning/types';

interface RouteParams {
  params: Promise<{ id: string; issueId: string }>;
}

interface CancelRequest {
  sessionId: string;
}

const logger = createLogger({ route: 'POST /api/projects/:id/issues/:issueId/plan/cancel' });

/**
 * Cancel planning workflow for an issue
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Parse request body
    const body = await request.json() as CancelRequest;
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Get current plan content
    const planContent = issue.planContent as unknown as PlanContent | null;
    if (!planContent || planContent.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Check if already completed or failed - still allow cancel but log it
    if (planContent.status === 'completed' || planContent.status === 'failed') {
      logger.info('Cancelling already finished planning', {
        sessionId,
        issueId: validIssueId,
        previousStatus: planContent.status,
      });
    }

    const now = new Date().toISOString();

    // Update plan content to failed status
    const updatedPlanContent: PlanContent = {
      ...planContent,
      status: 'failed',
      lastActivityAt: now,
      completedAt: now,
    };

    await IssueMetadataRepository.updatePlanContent(
      validIssueId,
      updatedPlanContent as unknown as Record<string, unknown>
    );

    // Mark the latest execution as cancelled if one exists
    const latestExecution = await IssueMetadataRepository.getLatestExecution(validIssueId);
    if (latestExecution && !latestExecution.completedAt) {
      await IssueMetadataRepository.completeExecution(
        latestExecution.id,
        'cancelled',
        'User cancelled planning'
      );
    }

    logger.info('Planning cancelled', { sessionId, issueId: validIssueId });

    return NextResponse.json({ success: true, cancelled: true });
  } catch (error) {
    logger.error('Failed to cancel planning', { error });
    return NextResponse.json(
      { error: 'Failed to cancel planning' },
      { status: 500 }
    );
  }
}
