/**
 * tRPC Event Emitter
 *
 * Type-safe event emitter for tRPC subscriptions using async generators.
 * Based on tRPC's recommended pattern for SSE subscriptions.
 */

import { EventEmitter, on } from 'events';
import type { WorkflowStatus } from '@/lib/graph/enums';

/**
 * Type-safe event map
 */
type EventMap<T> = Record<keyof T, unknown[]>;

/**
 * Iterable event emitter that converts events to async iterables
 * for use with tRPC subscription async generators.
 */
class IterableEventEmitter<T extends EventMap<T>> extends EventEmitter<T> {
  toIterable<TEventName extends keyof T & string>(
    eventName: TEventName,
    opts?: NonNullable<Parameters<typeof on>[2]>
  ): AsyncIterable<T[TEventName]> {
    return on(this as EventEmitter, eventName, opts) as AsyncIterable<T[TEventName]>;
  }
}

/**
 * Execution event types
 */
export interface ExecutionNodeState {
  status?: string;
  output?: unknown;
  error?: string;
}

export interface ExecutionLogEntry {
  timestamp: string;
  level: string;
  nodeId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionEvent {
  type:
    | 'connected'
    | 'node_started'
    | 'node_completed'
    | 'workflow_completed'
    | 'workflow_failed'
    | 'log';
  nodeId?: string;
  status?: WorkflowStatus;
  currentNodeId?: string;
  context?: Record<string, unknown>;
  nodeState?: ExecutionNodeState;
  nodeStates?: Record<string, ExecutionNodeState>;
  log?: ExecutionLogEntry;
}

/**
 * Planning event types
 */
export interface PlanningQuestionBatch {
  batchId: string;
  phase: string;
  questions: Array<{
    questionId: string;
    text: string;
    type: 'text' | 'choice' | 'multiselect';
    options?: string[];
    required?: boolean;
  }>;
}

export interface PlanningArtifact {
  type: 'diagram' | 'task' | 'uiMockup' | 'apiSpec';
  id: string;
  title: string;
  content: unknown;
}

export interface PlanningEvent {
  type:
    | 'connected'
    | 'question_batch'
    | 'artifact_generated'
    | 'phase_changed'
    | 'planning_completed'
    | 'planning_failed';
  sessionId?: string;
  status?: string;
  currentPhase?: string;
  questionBatch?: PlanningQuestionBatch;
  artifact?: PlanningArtifact;
  error?: string;
}

/**
 * Event map for all subscription events
 */
export interface SubscriptionEvents {
  execution: [executionId: string, event: ExecutionEvent];
  planning: [issueId: string, event: PlanningEvent];
}

/**
 * Global event emitter for tRPC subscriptions
 */
export const subscriptionEmitter = new IterableEventEmitter<SubscriptionEvents>();

/**
 * Emit an execution event to all subscribers
 */
export function emitExecutionEvent(
  executionId: string,
  event: ExecutionEvent
): void {
  subscriptionEmitter.emit('execution', executionId, event);
}

/**
 * Emit a planning event to all subscribers
 */
export function emitPlanningEvent(
  issueId: string,
  event: PlanningEvent
): void {
  subscriptionEmitter.emit('planning', issueId, event);
}
