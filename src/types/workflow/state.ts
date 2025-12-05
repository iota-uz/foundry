/**
 * Workflow state types
 */

import type { WorkflowId } from './workflow';
import type { StepExecution } from './step';
import type { DecisionEntry } from '../ai/qa-features';

/**
 * Workflow execution state
 */
export interface WorkflowState {
  sessionId: string;
  projectId: string;
  workflowId: WorkflowId;
  currentStepId: string;
  status: WorkflowStatus;

  // Topic tracking (for Q&A workflows)
  currentTopicIndex: number;
  currentQuestionIndex: number;
  topicQuestionCounts: Record<string, number>;

  // Answer tracking
  answers: Record<string, string | string[] | number | boolean>; // questionId -> answer
  skippedQuestions: string[];

  // Accumulated data from all steps
  data: Record<string, unknown>;

  // Clarify phase state (when active)
  clarifyState: ClarifyState | null;

  // Execution history
  stepHistory: StepExecution[];

  // Decision journal (F17)
  editHistory?: DecisionEntry[];

  // Checkpoint
  checkpoint: string;

  // Timestamps
  startedAt: string;
  lastActivityAt: string;
  pausedAt: string | null;
  completedAt: string | null;

  // Error tracking
  lastError: string | null;
  retryCount: number;
}

/**
 * Workflow execution status
 */
export type WorkflowStatus =
  | 'running'
  | 'paused'
  | 'waiting_user'
  | 'completed'
  | 'failed';

/**
 * Clarify workflow state
 */
export interface ClarifyState {
  ambiguities: Ambiguity[];
  currentIndex: number;
  resolvedCount: number;
  deferredCount: number;
  status: ClarifyStatus;
}

/**
 * Clarify workflow status
 */
export type ClarifyStatus = 'scanning' | 'categorizing' | 'resolving' | 'complete';

/**
 * Ambiguity detected during clarify phase
 */
export interface Ambiguity {
  id: string;
  featureId: string;
  type: AmbiguityType;
  severity: AmbiguitySeverity;
  text: string; // The problematic text
  context: string; // Where it appears
  question: string; // Clarification question
  options?: string[] | undefined; // Suggested answers
  resolution?: string | undefined; // User's answer
  status: AmbiguityStatus;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

/**
 * Type of ambiguity
 */
export type AmbiguityType =
  | 'vague_language'
  | 'missing_edge_case'
  | 'ambiguous_flow'
  | 'conflict';

/**
 * Severity level
 */
export type AmbiguitySeverity = 'high' | 'medium' | 'low';

/**
 * Ambiguity resolution status
 */
export type AmbiguityStatus = 'pending' | 'resolved' | 'deferred';

/**
 * Edit record for answer changes
 */
export interface EditRecord {
  questionId: string;
  previousAnswer: string | string[] | number | boolean;
  newAnswer: string | string[] | number | boolean;
  editedAt: string;
  affectedSteps: string[]; // Step IDs that need re-execution
}

/**
 * Workflow context for step execution
 */
export interface WorkflowContext {
  sessionId: string;
  projectId: string;
  workflowId: WorkflowId;
  state: WorkflowState;
  constitution: Record<string, unknown> | null; // Constitution if available
}
