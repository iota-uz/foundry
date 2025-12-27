/**
 * Planning Stream API
 *
 * GET /api/projects/:id/issues/:issueId/plan/stream - SSE stream for real-time planning updates
 */

import { NextResponse } from 'next/server';
import {
  ProjectRepository,
  IssueMetadataRepository,
} from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';
import type { PlanningSSEEvent, PlanContent } from '@/lib/planning/types';

interface RouteParams {
  params: Promise<{ id: string; issueId: string }>;
}

/**
 * SSE endpoint for planning updates
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id, issueId } = await params;
  const validId = validateUuid(id);
  if (validId instanceof NextResponse) {
    return new Response(JSON.stringify({ error: 'Invalid project UUID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validIssueId = validateUuid(issueId);
  if (validIssueId instanceof NextResponse) {
    return new Response(JSON.stringify({ error: 'Invalid issue UUID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify project exists
  const project = await ProjectRepository.getProject(validId);
  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify issue exists and belongs to project
  const issue = await IssueMetadataRepository.getIssueMetadata(validIssueId);
  if (!issue || issue.projectId !== validId) {
    return new Response(JSON.stringify({ error: 'Issue not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send initial state
      const planContent = issue.planContent as any as PlanContent | null;
      
      const initialEvent: PlanningSSEEvent = {
        type: 'connected',
        data: {
          sessionId: planContent?.sessionId || '',
        },
      };
      
      const initialData = 'data: ' + JSON.stringify(initialEvent) + '\n\n';
      controller.enqueue(encoder.encode(initialData));

      // If planning is already completed or failed, send final event and close
      if (planContent?.status === 'completed') {
        const completedEvent: PlanningSSEEvent = {
          type: 'planning_completed',
          data: {
            summary: planContent.artifacts,
          },
        };
        const completedData = 'data: ' + JSON.stringify(completedEvent) + '\n\n';
        controller.enqueue(encoder.encode(completedData));
        controller.close();
        return;
      }

      if (planContent?.status === 'failed') {
        const failedEvent: PlanningSSEEvent = {
          type: 'planning_failed',
          data: {
            error: 'Planning workflow failed',
          },
        };
        const failedData = 'data: ' + JSON.stringify(failedEvent) + '\n\n';
        controller.enqueue(encoder.encode(failedData));
        controller.close();
        return;
      }

      // TODO: Subscribe to workflow execution events
      // For now, just keep connection open
      // In the future, this should subscribe to GraphEngine workflow events
      // and emit PlanningSSEEvent types as the workflow progresses

      // Keep connection alive with periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30 seconds

      // Cleanup on connection close
      return () => {
        clearInterval(heartbeatInterval);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
