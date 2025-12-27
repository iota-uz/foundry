/**
 * Start Planning API
 *
 * POST /api/projects/:id/issues/:issueId/plan/start - Start planning workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ProjectRepository,
  IssueMetadataRepository,
} from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';
import type { StartPlanRequest, StartPlanResponse, PlanContent } from '@/lib/planning/types';
import {
  runPlanningStep,
  createPlanningInitialState,
} from '@/lib/planning/execution';
import { randomUUID } from 'crypto';

interface RouteParams {
  params: Promise<{ id: string; issueId: string }>;
}

/**
 * Start planning workflow for an issue
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
    const body = await request.json() as StartPlanRequest;
    const preferences = body.preferences || {};

    // Generate session ID
    const sessionId = randomUUID();

    // Initialize plan content
    const now = new Date().toISOString();
    const planContent: PlanContent = {
      sessionId,
      status: 'requirements',
      currentPhase: 'requirements',
      questionBatches: [],
      currentBatchIndex: 0,
      answers: {},
      artifacts: {
        diagrams: [],
        tasks: [],
        uiMockups: [],
        apiSpecs: [],
      },
      startedAt: now,
      lastActivityAt: now,
      completedAt: null,
    };

    // Update issue metadata with initial plan content
    await IssueMetadataRepository.updatePlanContent(validIssueId, planContent as unknown as Record<string, unknown>);

    // Create execution record
    const execution = await IssueMetadataRepository.createExecution({
      issueMetadataId: validIssueId,
      triggeredBy: 'manual',
      triggerStatus: null,
      fromStatus: issue.currentStatus || null,
    });

    // Build stream URL
    const streamUrl = `/api/projects/${id}/issues/${issueId}/plan/stream`;

    // Start workflow execution in background (don't await - it runs async)
    const initialState = createPlanningInitialState({
      issueMetadataId: validIssueId,
      issueId: validIssueId,
      issueTitle: body.issueTitle || `Issue #${issue.issueNumber}`,
      issueBody: body.issueBody || '',
      preferences,
    });

    // Run the first step of the workflow asynchronously
    void runPlanningStep(execution.id, validIssueId, initialState).catch((error) => {
      console.error('Planning workflow failed:', error);
    });

    const response: StartPlanResponse = {
      sessionId,
      workflowId: execution.id,
      status: 'started',
      streamUrl,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to start planning:', error);
    return NextResponse.json(
      { error: 'Failed to start planning' },
      { status: 500 }
    );
  }
}
