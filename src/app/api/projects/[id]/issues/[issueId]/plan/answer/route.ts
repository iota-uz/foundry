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

interface RouteParams {
  params: Promise<{ id: string; issueId: string }>;
}

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

    const planContent = issue.planContent as any as PlanContent;

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

    // Save to database
    await IssueMetadataRepository.updatePlanContent(validIssueId, updatedPlanContent as any);

    // TODO: Resume workflow execution
    // For now, we'll just return success
    // In the future, this should resume the GraphEngine workflow

    // Determine next batch (if any)
    const nextBatchIndex = planContent.currentBatchIndex + 1;
    const nextBatch = planContent.questionBatches[nextBatchIndex];

    const response: SubmitAnswersResponse = {
      accepted: true,
      completed: !nextBatch && planContent.status === 'completed',
    };

    if (nextBatch) {
      response.nextBatch = nextBatch;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to submit answers:', error);
    return NextResponse.json(
      { error: 'Failed to submit answers' },
      { status: 500 }
    );
  }
}
