/**
 * GET /api/workflow/stream - Server-Sent Events endpoint for workflow updates
 */

import { NextRequest } from 'next/server';
import type { SSEEvent } from '@/types/workflow/events';
import { getWorkflowEngine } from '@/services/workflow/engine';
import { questionEvents } from '@/services/workflow/handlers/question.handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Get sessionId from query params
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  const workflowEngine = getWorkflowEngine();

  // Create a new ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper function to send SSE event
      const sendEvent = (event: SSEEvent) => {
        try {
          const eventString = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(eventString));
        } catch (err) {
          console.error('Error sending SSE event:', err);
        }
      };

      // Helper function to send keepalive comment
      const sendKeepalive = () => {
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'));
        } catch (err) {
          // Controller might be closed, ignore
        }
      };

      // Set up keepalive interval (every 15 seconds)
      const keepaliveInterval = setInterval(() => {
        sendKeepalive();
      }, 15000);

      // WorkflowEngine event handlers
      const onStepStart = (data: unknown) => {
        if (data.sessionId === sessionId) {
          sendEvent({ type: 'step_start', data });
        }
      };

      const onStepComplete = (data: unknown) => {
        if (data.sessionId === sessionId) {
          sendEvent({ type: 'step_complete', data });
        }
      };

      const onStepError = (data: unknown) => {
        if (data.sessionId === sessionId) {
          sendEvent({ type: 'step_error', data });
        }
      };

      const onWorkflowPause = (data: unknown) => {
        if (data.sessionId === sessionId) {
          sendEvent({ type: 'workflow_pause', data });
        }
      };

      const onWorkflowResume = (data: unknown) => {
        if (data.sessionId === sessionId) {
          sendEvent({ type: 'workflow_resume', data });
        }
      };

      const onWorkflowComplete = (data: unknown) => {
        if (data.sessionId === sessionId) {
          sendEvent({ type: 'complete', data });
        }
      };

      const onWorkflowError = (data: unknown) => {
        if (data.sessionId === sessionId) {
          sendEvent({ type: 'error', data });
        }
      };

      // Question handler event
      const onQuestion = (data: unknown) => {
        if (data.sessionId === sessionId) {
          sendEvent({ type: 'question', data });
        }
      };

      // Register all event listeners
      workflowEngine.on('step:start', onStepStart);
      workflowEngine.on('step:complete', onStepComplete);
      workflowEngine.on('step:error', onStepError);
      workflowEngine.on('workflow:pause', onWorkflowPause);
      workflowEngine.on('workflow:resume', onWorkflowResume);
      workflowEngine.on('workflow:complete', onWorkflowComplete);
      workflowEngine.on('workflow:error', onWorkflowError);
      questionEvents.on('question', onQuestion);

      // Send initial connection event
      sendEvent({
        type: 'progress',
        data: {
          message: `Connected to workflow session: ${sessionId}`,
        },
      });

      // Load current state and send if exists
      try {
        const state = await workflowEngine.getState(sessionId);
        if (state) {
          sendEvent({
            type: 'progress',
            data: {
              message: `Loaded existing session: ${state.workflowId} (Step: ${state.currentStepId}, Status: ${state.status})`,
            },
          });
        }
      } catch (err) {
        console.error('Error loading workflow state:', err);
      }

      // Handle client disconnect
      const cleanup = () => {
        clearInterval(keepaliveInterval);

        // Unsubscribe from all events
        workflowEngine.off('step:start', onStepStart);
        workflowEngine.off('step:complete', onStepComplete);
        workflowEngine.off('step:error', onStepError);
        workflowEngine.off('workflow:pause', onWorkflowPause);
        workflowEngine.off('workflow:resume', onWorkflowResume);
        workflowEngine.off('workflow:complete', onWorkflowComplete);
        workflowEngine.off('workflow:error', onWorkflowError);
        questionEvents.off('question', onQuestion);

        console.log('Client disconnected from SSE stream:', sessionId);

        try {
          controller.close();
        } catch (err) {
          // Controller might already be closed
          console.error('Error closing controller:', err);
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
