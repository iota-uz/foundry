/**
 * Resume Planning API
 *
 * POST /api/projects/:id/issues/:issueId/plan/resume - Resume paused planning workflow
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

interface ResumeRequest {
  sessionId: string;
}

const logger = createLogger({ route: 'POST /api/projects/:id/issues/:issueId/plan/resume' });

/**
 * Resume paused planning workflow for an issue
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
    const body = await request.json() as ResumeRequest;
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Get current plan content
    const planContent = issue.planContent as unknown as (PlanContent & { paused?: boolean }) | null;
    if (!planContent || planContent.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Check if already completed or failed
    if (planContent.status === 'completed' || planContent.status === 'failed') {
      return NextResponse.json({ error: 'Planning already finished' }, { status: 400 });
    }

    // Update plan content - clear paused flag
    const updatedPlanContent = {
      ...planContent,
      paused: false,
      lastActivityAt: new Date().toISOString(),
    };

    await IssueMetadataRepository.updatePlanContent(
      validIssueId,
      updatedPlanContent as unknown as Record<string, unknown>
    );

    logger.info('Planning resumed', { sessionId, issueId: validIssueId });

    return NextResponse.json({ success: true, resumed: true });
  } catch (error) {
    logger.error('Failed to resume planning', { error });
    return NextResponse.json(
      { error: 'Failed to resume planning' },
      { status: 500 }
    );
  }
}
