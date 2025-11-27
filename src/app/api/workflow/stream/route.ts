/**
 * GET /api/workflow/stream - Server-Sent Events endpoint for workflow updates
 */

import { NextRequest } from 'next/server';
import type { SSEEvent } from '@/types/workflow/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Get sessionId from query params
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  // Create a new ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper function to send SSE event
      const sendEvent = (event: SSEEvent) => {
        const eventString = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
        controller.enqueue(encoder.encode(eventString));
      };

      // Helper function to send keepalive comment
      const sendKeepalive = () => {
        controller.enqueue(encoder.encode(':keepalive\n\n'));
      };

      // TODO: Get WorkflowEngine instance
      // const workflowEngine = getWorkflowEngine();

      // TODO: Subscribe to workflow events
      // const unsubscribe = workflowEngine.subscribe(sessionId, (event: SSEEvent) => {
      //   sendEvent(event);
      // });

      // TODO: In production, WorkflowEngine would emit events
      // Example event handler registration:
      // workflowEngine.on('step_start', (data) => sendEvent({ type: 'step_start', data }));
      // workflowEngine.on('step_complete', (data) => sendEvent({ type: 'step_complete', data }));
      // workflowEngine.on('question', (data) => sendEvent({ type: 'question', data }));
      // workflowEngine.on('spec_update', (data) => sendEvent({ type: 'spec_update', data }));
      // workflowEngine.on('topic_complete', (data) => sendEvent({ type: 'topic_complete', data }));
      // workflowEngine.on('phase_change', (data) => sendEvent({ type: 'phase_change', data }));
      // workflowEngine.on('generator_start', (data) => sendEvent({ type: 'generator_start', data }));
      // workflowEngine.on('generator_complete', (data) => sendEvent({ type: 'generator_complete', data }));
      // workflowEngine.on('clarify_start', (data) => sendEvent({ type: 'clarify_start', data }));
      // workflowEngine.on('ambiguity', (data) => sendEvent({ type: 'ambiguity', data }));
      // workflowEngine.on('llm_progress', (data) => sendEvent({ type: 'llm_progress', data }));
      // workflowEngine.on('progress', (data) => sendEvent({ type: 'progress', data }));
      // workflowEngine.on('step_error', (data) => sendEvent({ type: 'step_error', data }));
      // workflowEngine.on('error', (data) => sendEvent({ type: 'error', data }));
      // workflowEngine.on('complete', (data) => sendEvent({ type: 'complete', data }));

      // Set up keepalive interval (every 15 seconds)
      const keepaliveInterval = setInterval(() => {
        sendKeepalive();
      }, 15000);

      // Send initial connection event
      sendEvent({
        type: 'progress',
        data: {
          message: `Connected to workflow session: ${sessionId}`,
        },
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);

        // TODO: Unsubscribe from WorkflowEngine events
        // unsubscribe();

        console.log('Client disconnected from SSE stream:', sessionId);

        try {
          controller.close();
        } catch (err) {
          // Controller might already be closed
          console.error('Error closing controller:', err);
        }
      });

      // TODO: In production, events would be emitted by WorkflowEngine
      // For now, this stream will stay open waiting for events
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
