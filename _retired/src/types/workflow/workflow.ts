/**
 * Workflow definition types
 */

import type { StepDefinition } from './step';

/**
 * Workflow identifiers
 */
export type WorkflowId =
  | 'main-orchestration'
  | 'cpo-phase'
  | 'clarify-phase'
  | 'cto-phase'
  | 're-workflow'
  | 'actualize-workflow'
  | 'analyzer-workflow'
  | 'schema-generator'
  | 'api-generator'
  | 'component-generator';

/**
 * Workflow definition with steps and configuration
 */
export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  description: string;
  steps: StepDefinition[];
  topics?: TopicDefinition[]; // For Q&A workflows (CPO, CTO)
  timeout?: number; // Overall workflow timeout in ms
  retryPolicy?: RetryPolicy;
}

/**
 * Topic definition for Q&A workflows
 */
export interface TopicDefinition {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedQuestions: number;
  phase: 'cpo' | 'cto';
  triggerGenerator?: GeneratorType; // Auto-invoke generator after topic
}

/**
 * Generator type for auto-invocation
 */
export type GeneratorType = 'schema' | 'api' | 'component';

/**
 * Retry policy for workflow steps
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  sessionId: string;
  workflowId: WorkflowId;
  status: 'completed' | 'failed' | 'cancelled';
  data: Record<string, unknown>;
  error?: string;
  duration: number;
  startedAt: string;
  completedAt: string;
}
