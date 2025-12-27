/**
 * Submit Answers API
 *
 * POST /api/projects/:id/issues/:issueId/plan/answer - Submit answers to current question batch
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ProjectRepository,
  IssueMetadataRepository,
} from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';
import type {
  SubmitAnswersRequest,
  SubmitAnswersResponse,
  PlanContent,
  Answer,
} from '@/lib/planning/types';
import { resumePlanningWithAnswers } from '@/lib/planning/execution';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string; issueId: string }>;
}

const logger = createLogger({ route: 'POST /api/projects/:id/issues/:issueId/plan/answer' });

/**
 * Submit answers to current question batch
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

    // Check if plan exists
    if (!issue.planContent) {
      return NextResponse.json(
        { error: 'No active planning session' },
        { status: 400 }
      );
    }

    const planContent = issue.planContent as unknown as PlanContent;

    // Parse request body
    const body = await request.json() as SubmitAnswersRequest;

    // Validate session ID
    if (body.sessionId !== planContent.sessionId) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Validate batch ID
    const currentBatch = planContent.questionBatches.find(
      (batch) => batch.batchId === body.batchId
    );

    if (!currentBatch) {
      return NextResponse.json(
        { error: 'Invalid batch ID' },
        { status: 400 }
      );
    }

    // Store answers
    const now = new Date().toISOString();
    const updatedAnswers: Record<string, Answer> = { ...planContent.answers };

    for (const answer of body.answers) {
      updatedAnswers[answer.questionId] = {
        questionId: answer.questionId,
        value: answer.value,
        answeredAt: now,
        skipped: false,
      };
    }

    // Handle skipped questions
    if (body.skippedQuestions) {
      for (const questionId of body.skippedQuestions) {
        updatedAnswers[questionId] = {
          questionId,
          value: '',
          answeredAt: now,
          skipped: true,
        };
      }
    }

    // Update batch status
    const updatedBatches = planContent.questionBatches.map((batch) => {
      if (batch.batchId === body.batchId) {
        return {
          ...batch,
          status: 'completed' as const,
          completedAt: now,
        };
      }
      return batch;
    });

    // Update plan content
    const updatedPlanContent: PlanContent = {
      ...planContent,
      answers: updatedAnswers,
      questionBatches: updatedBatches,
      lastActivityAt: now,
    };

    // Save answers to database first
    await IssueMetadataRepository.updatePlanContent(validIssueId, updatedPlanContent as unknown as Record<string, unknown>);

    // Get the latest execution for this issue
    const execution = await IssueMetadataRepository.getLatestExecution(validIssueId);
    if (!execution) {
      return NextResponse.json(
        { error: 'No active workflow execution found' },
        { status: 400 }
      );
    }

    // Resume workflow execution with the submitted answers
    void resumePlanningWithAnswers(execution.id, validIssueId, updatedAnswers).catch((error) => {
      logger.error('Planning workflow resume failed', { error: error });
    });

    // Return success - workflow will continue asynchronously
    // SSE stream will provide real-time updates including next batch
    const response: SubmitAnswersResponse = {
      accepted: true,
      completed: false, // Will be updated via SSE when workflow completes
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to submit answers', { error: error });
    return NextResponse.json(
      { error: 'Failed to submit answers' },
      { status: 500 }
    );
  }
}
