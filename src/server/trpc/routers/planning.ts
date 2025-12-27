/**
 * Planning Router
 *
 * tRPC procedures for AI-powered issue planning.
 * Replaces: /api/projects/:id/issues/:issueId/plan/*
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import { router, publicProcedure } from '../init';
import {
  ProjectRepository,
  IssueMetadataRepository,
  WorkflowRepository,
} from '@/lib/db/repositories';
import {
  runPlanningStep,
  createPlanningInitialState,
  resumePlanningWithAnswers,
} from '@/lib/planning/execution';
import type {
  PlanContent,
  Answer,
} from '@/lib/planning/types';
import { subscriptionEmitter, type PlanningEvent } from '../events';

export const planningRouter = router({
  /**
   * Get current plan state for an issue
   * Replaces: GET /api/projects/:id/issues/:issueId/plan
   */
  getState: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        issueId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const project = await ProjectRepository.getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const issue = await IssueMetadataRepository.getIssueMetadata(input.issueId);
      if (!issue || issue.projectId !== input.projectId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Issue not found',
        });
      }

      const planContent = (issue.planContent as unknown as PlanContent | null) ?? null;

      const response: {
        planContent: PlanContent | null;
        sessionId?: string;
        workflowStatus?: string;
      } = {
        planContent,
      };

      // If there's a planning session, try to get workflow status
      if (planContent?.sessionId) {
        const latestExecution = await IssueMetadataRepository.getLatestExecution(
          input.issueId
        );
        if (latestExecution?.workflowExecutionId) {
          const execution = await WorkflowRepository.getExecution(
            latestExecution.workflowExecutionId
          );
          if (execution) {
            response.sessionId = planContent.sessionId;
            response.workflowStatus = execution.status;
          }
        }
      }

      return response;
    }),

  /**
   * List all executions for a specific issue
   * Replaces: GET /api/projects/:id/issues/:issueId/executions
   */
  listExecutions: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        issueId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const project = await ProjectRepository.getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const issue = await IssueMetadataRepository.getIssueMetadata(input.issueId);
      if (!issue || issue.projectId !== input.projectId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Issue not found',
        });
      }

      const executions = await IssueMetadataRepository.listExecutions(input.issueId);
      return executions;
    }),

  /**
   * Start planning workflow for an issue
   * Replaces: POST /api/projects/:id/issues/:issueId/plan/start
   */
  start: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        issueId: z.string().uuid(),
        issueTitle: z.string().optional(),
        issueBody: z.string().optional(),
        preferences: z.record(z.unknown()).optional().default({}),
      })
    )
    .mutation(async ({ input }) => {
      const project = await ProjectRepository.getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const issue = await IssueMetadataRepository.getIssueMetadata(input.issueId);
      if (!issue || issue.projectId !== input.projectId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Issue not found',
        });
      }

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
      await IssueMetadataRepository.updatePlanContent(
        input.issueId,
        planContent as unknown as Record<string, unknown>
      );

      // Create execution record
      const execution = await IssueMetadataRepository.createExecution({
        issueMetadataId: input.issueId,
        triggeredBy: 'manual',
        triggerStatus: null,
        fromStatus: issue.currentStatus || null,
      });

      // Build stream URL
      const streamUrl = `/api/projects/${input.projectId}/issues/${input.issueId}/plan/stream`;

      // Start workflow execution in background
      const initialState = createPlanningInitialState({
        issueMetadataId: input.issueId,
        issueId: input.issueId,
        issueTitle: input.issueTitle || `Issue #${issue.issueNumber}`,
        issueBody: input.issueBody || '',
        preferences: input.preferences,
      });

      // Run the first step of the workflow asynchronously
      void runPlanningStep(execution.id, input.issueId, initialState).catch((error) => {
        console.error('Planning workflow failed:', error);
      });

      return {
        sessionId,
        workflowId: execution.id,
        status: 'started' as const,
        streamUrl,
      };
    }),

  /**
   * Submit answers to current question batch
   * Replaces: POST /api/projects/:id/issues/:issueId/plan/answer
   */
  submitAnswers: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        issueId: z.string().uuid(),
        sessionId: z.string().uuid(),
        batchId: z.string(),
        answers: z.array(
          z.object({
            questionId: z.string(),
            value: z.string(),
          })
        ),
        skippedQuestions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const project = await ProjectRepository.getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const issue = await IssueMetadataRepository.getIssueMetadata(input.issueId);
      if (!issue || issue.projectId !== input.projectId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Issue not found',
        });
      }

      if (!issue.planContent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No active planning session',
        });
      }

      const planContent = issue.planContent as unknown as PlanContent;

      // Validate session ID
      if (input.sessionId !== planContent.sessionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid session ID',
        });
      }

      // Validate batch ID
      const currentBatch = planContent.questionBatches.find(
        (batch) => batch.batchId === input.batchId
      );

      if (!currentBatch) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid batch ID',
        });
      }

      // Store answers
      const now = new Date().toISOString();
      const updatedAnswers: Record<string, Answer> = { ...planContent.answers };

      for (const answer of input.answers) {
        updatedAnswers[answer.questionId] = {
          questionId: answer.questionId,
          value: answer.value,
          answeredAt: now,
          skipped: false,
        };
      }

      // Handle skipped questions
      if (input.skippedQuestions) {
        for (const questionId of input.skippedQuestions) {
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
        if (batch.batchId === input.batchId) {
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

      // Save answers to database
      await IssueMetadataRepository.updatePlanContent(
        input.issueId,
        updatedPlanContent as unknown as Record<string, unknown>
      );

      // Get the latest execution for this issue
      const execution = await IssueMetadataRepository.getLatestExecution(input.issueId);
      if (!execution) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No active workflow execution found',
        });
      }

      // Resume workflow execution with the submitted answers
      void resumePlanningWithAnswers(
        execution.id,
        input.issueId,
        updatedAnswers
      ).catch((error) => {
        console.error('Planning workflow resume failed:', error);
      });

      return {
        accepted: true,
        completed: false, // Will be updated via subscription when workflow completes
      };
    }),

  /**
   * Stream planning updates via SSE
   * Replaces: GET /api/projects/:id/issues/:issueId/plan/stream
   *
   * Uses async generator pattern for tRPC subscriptions over SSE.
   */
  stream: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        issueId: z.string().uuid(),
      })
    )
    .subscription(async function* (opts) {
      const { projectId, issueId } = opts.input;

      // Verify project exists
      const project = await ProjectRepository.getProject(projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Verify issue exists and belongs to project
      const issue = await IssueMetadataRepository.getIssueMetadata(issueId);
      if (!issue || issue.projectId !== projectId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Issue not found',
        });
      }

      // Get plan content for initial state
      const planContent = issue.planContent as unknown as PlanContent | null;

      // Send initial connected event
      const initialEvent: PlanningEvent = {
        type: 'connected',
        sessionId: planContent?.sessionId || '',
        status: planContent?.status || 'idle',
        ...(planContent?.currentPhase && { currentPhase: planContent.currentPhase }),
      };
      yield initialEvent;

      // If already completed or failed, send final event and exit
      if (planContent?.status === 'completed') {
        const completedEvent: PlanningEvent = {
          type: 'planning_completed',
          sessionId: planContent.sessionId,
        };
        yield completedEvent;
        return;
      }

      if (planContent?.status === 'failed') {
        const failedEvent: PlanningEvent = {
          type: 'planning_failed',
          error: 'Planning workflow failed',
        };
        yield failedEvent;
        return;
      }

      // Listen for planning events
      for await (const [eventIssueId, event] of subscriptionEmitter.toIterable(
        'planning',
        { signal: opts.signal }
      )) {
        // Only emit events for this issue
        if (eventIssueId === issueId) {
          yield event;

          // Exit if planning completed or failed
          if (
            event.type === 'planning_completed' ||
            event.type === 'planning_failed'
          ) {
            return;
          }
        }
      }
    }),
});
