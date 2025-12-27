/**
 * Execution Events
 *
 * Manages SSE subscriptions for real-time execution updates.
 * In production, this would be replaced with a pub/sub system (Redis, etc.)
 *
 * NOTE: This module bridges the legacy SSE system with the new tRPC subscriptions.
 * Both systems are supported during the migration period.
 */

import type { WorkflowStatus } from '@/lib/graph/enums';
import { emitExecutionEvent, type ExecutionEvent } from '@/server/trpc/events';

// Global map of active execution streams
const executionStreams = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

/**
 * Subscribe a controller to execution updates
 */
export function subscribeToExecution(
  executionId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): void {
  if (!executionStreams.has(executionId)) {
    executionStreams.set(executionId, new Set());
  }
  executionStreams.get(executionId)!.add(controller);
}

/**
 * Unsubscribe a controller from execution updates
 */
export function unsubscribeFromExecution(
  executionId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): void {
  const controllers = executionStreams.get(executionId);
  if (controllers) {
    controllers.delete(controller);
    if (controllers.size === 0) {
      executionStreams.delete(executionId);
    }
  }
}

/**
 * Broadcast an event to all subscribers of an execution
 *
 * This function sends events to both:
 * 1. Legacy SSE subscribers (ReadableStreamDefaultController)
 * 2. tRPC subscription subscribers (via event emitter)
 */
export function broadcastExecutionEvent(
  executionId: string,
  event: {
    type: string;
    nodeId?: string;
    status?: WorkflowStatus;
    currentNodeId?: string;
    context?: Record<string, unknown>;
    nodeState?: {
      status?: string;
      output?: unknown;
      error?: string;
    };
    log?: {
      timestamp: string;
      level: string;
      nodeId?: string;
      message: string;
      metadata?: Record<string, unknown>;
    };
    /** Error message for planning_failed events */
    error?: string;
    /** Artifacts summary for planning_completed events */
    summary?: unknown;
  }
): void {
  // Emit to tRPC subscriptions
  emitExecutionEvent(executionId, event as ExecutionEvent);

  // Emit to legacy SSE subscribers
  const controllers = executionStreams.get(executionId);
  if (!controllers) return;

  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoded = encoder.encode(data);

  for (const controller of controllers) {
    try {
      controller.enqueue(encoded);
    } catch {
      // Controller is closed, remove it
      controllers.delete(controller);
    }
  }
}

/**
 * Check if there are active subscribers for an execution
 */
export function hasSubscribers(executionId: string): boolean {
  const controllers = executionStreams.get(executionId);
  return controllers ? controllers.size > 0 : false;
}
