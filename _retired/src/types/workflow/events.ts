/**
 * Server-Sent Events (SSE) types for real-time workflow communication
 */

import type { AIQuestion } from './step';
import type { Ambiguity } from './state';

/**
 * Base SSE event
 */
export interface BaseSSEEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Step started event
 */
export interface StepStartEvent extends BaseSSEEvent {
  type: 'step_start';
  data: {
    stepId: string;
    stepType: 'code' | 'llm' | 'question' | 'conditional' | 'loop' | 'nested_workflow';
    description: string;
  };
}

/**
 * Step completed event
 */
export interface StepCompleteEvent extends BaseSSEEvent {
  type: 'step_complete';
  data: {
    stepId: string;
    result?: Record<string, unknown>;
  };
}

/**
 * Question event
 */
export interface QuestionEvent extends BaseSSEEvent {
  type: 'question';
  data: {
    question: AIQuestion;
    topicId?: string;
    topicName?: string;
    questionIndex: number;
    totalQuestions: number;
    phase: 'cpo' | 'clarify' | 'cto';
  };
}

/**
 * Spec update event
 */
export interface SpecUpdateEvent extends BaseSSEEvent {
  type: 'spec_update';
  data: {
    artifactType: 'schema' | 'api' | 'component' | 'feature';
    artifactId: string;
    action: 'create' | 'update' | 'delete';
  };
}

/**
 * Topic completed event
 */
export interface TopicCompleteEvent extends BaseSSEEvent {
  type: 'topic_complete';
  data: {
    topicId: string;
    topicName: string;
    questionsAnswered: number;
    nextTopicId?: string;
  };
}

/**
 * Phase transition event
 */
export interface PhaseEvent extends BaseSSEEvent {
  type: 'phase_change';
  data: {
    from: 'cpo-phase' | 'clarify-phase' | 'cto-phase';
    to: 'clarify-phase' | 'cto-phase' | 'complete';
  };
}

/**
 * Generator started event
 */
export interface GeneratorStartEvent extends BaseSSEEvent {
  type: 'generator_start';
  data: {
    generatorType: 'schema' | 'api' | 'component';
    triggeredByTopic: string;
  };
}

/**
 * Generator completed event
 */
export interface GeneratorCompleteEvent extends BaseSSEEvent {
  type: 'generator_complete';
  data: {
    generatorType: 'schema' | 'api' | 'component';
    artifactsCreated: string[];
  };
}

/**
 * Clarify phase started event
 */
export interface ClarifyStartEvent extends BaseSSEEvent {
  type: 'clarify_start';
  data: {
    ambiguityCount: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

/**
 * Ambiguity detected event
 */
export interface AmbiguityEvent extends BaseSSEEvent {
  type: 'ambiguity';
  data: Ambiguity;
}

/**
 * LLM progress event
 */
export interface LLMProgressEvent extends BaseSSEEvent {
  type: 'llm_progress';
  data: {
    stepId: string;
    message: string;
    tokensUsed?: number;
  };
}

/**
 * General progress event
 */
export interface ProgressEvent extends BaseSSEEvent {
  type: 'progress';
  data: {
    message: string;
    percent?: number;
  };
}

/**
 * Step error event
 */
export interface StepErrorEvent extends BaseSSEEvent {
  type: 'step_error';
  data: {
    stepId: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Workflow error event
 */
export interface ErrorEvent extends BaseSSEEvent {
  type: 'error';
  data: {
    message: string;
    retryable: boolean;
  };
}

/**
 * Workflow paused event
 */
export interface WorkflowPauseEvent extends BaseSSEEvent {
  type: 'workflow_pause';
  data: {
    sessionId: string;
    currentStepId: string;
  };
}

/**
 * Workflow resumed event
 */
export interface WorkflowResumeEvent extends BaseSSEEvent {
  type: 'workflow_resume';
  data: {
    sessionId: string;
    currentStepId: string;
  };
}

/**
 * Workflow complete event
 */
export interface CompleteEvent extends BaseSSEEvent {
  type: 'complete';
  data: {
    workflowId: string;
    summary: string;
    nextWorkflowId?: string;
  };
}

/**
 * Union of all SSE event types
 */
export type SSEEvent =
  | StepStartEvent
  | StepCompleteEvent
  | QuestionEvent
  | SpecUpdateEvent
  | TopicCompleteEvent
  | PhaseEvent
  | GeneratorStartEvent
  | GeneratorCompleteEvent
  | ClarifyStartEvent
  | AmbiguityEvent
  | LLMProgressEvent
  | ProgressEvent
  | StepErrorEvent
  | ErrorEvent
  | WorkflowPauseEvent
  | WorkflowResumeEvent
  | CompleteEvent;
