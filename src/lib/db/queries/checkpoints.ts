/**
 * Workflow checkpoint queries
 */

import type { Database } from 'bun:sqlite';
import type { WorkflowState } from '@/types/workflow/state';
import { getDatabase } from '../client';

interface CheckpointRow {
  id: string;
  session_id: string;
  project_id: string;
  workflow_id: string;
  current_step_id: string;
  status: string;
  current_topic_index: number;
  current_question_index: number;
  topic_question_counts: string;
  answers: string;
  skipped_questions: string;
  data: string;
  clarify_state: string | null;
  step_history: string;
  checkpoint: string | null;
  started_at: string;
  last_activity_at: string;
  paused_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  retry_count: number;
}

/**
 * Save a workflow checkpoint
 */
export function saveCheckpoint(
  checkpoint: WorkflowState,
  db?: Database
): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO workflow_checkpoints (
      id,
      session_id,
      project_id,
      workflow_id,
      current_step_id,
      status,
      current_topic_index,
      current_question_index,
      topic_question_counts,
      answers,
      skipped_questions,
      data,
      clarify_state,
      step_history,
      checkpoint,
      started_at,
      last_activity_at,
      paused_at,
      completed_at,
      last_error,
      retry_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    checkpoint.sessionId,
    checkpoint.sessionId,
    checkpoint.projectId,
    checkpoint.workflowId,
    checkpoint.currentStepId,
    checkpoint.status,
    checkpoint.currentTopicIndex,
    checkpoint.currentQuestionIndex,
    JSON.stringify(checkpoint.topicQuestionCounts),
    JSON.stringify(checkpoint.answers),
    JSON.stringify(checkpoint.skippedQuestions),
    JSON.stringify(checkpoint.data),
    checkpoint.clarifyState ? JSON.stringify(checkpoint.clarifyState) : null,
    JSON.stringify(checkpoint.stepHistory),
    checkpoint.checkpoint,
    checkpoint.startedAt,
    checkpoint.lastActivityAt,
    checkpoint.pausedAt,
    checkpoint.completedAt,
    checkpoint.lastError,
    checkpoint.retryCount
  );
}

/**
 * Get a checkpoint by session ID
 */
export function getCheckpoint(
  sessionId: string,
  db?: Database
): WorkflowState | null {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM workflow_checkpoints
    WHERE session_id = ?
  `);

  const row = stmt.get(sessionId) as CheckpointRow | null;

  if (!row) {
    return null;
  }

  return rowToWorkflowState(row);
}

/**
 * List all checkpoints for a project
 */
export function listCheckpoints(
  projectId: string,
  db?: Database
): WorkflowState[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM workflow_checkpoints
    WHERE project_id = ?
    ORDER BY last_activity_at DESC
  `);

  const rows = stmt.all(projectId) as CheckpointRow[];

  return rows.map(rowToWorkflowState);
}

/**
 * Delete a checkpoint
 */
export function deleteCheckpoint(sessionId: string, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    DELETE FROM workflow_checkpoints
    WHERE session_id = ?
  `);

  stmt.run(sessionId);
}

/**
 * Get active checkpoint for a project (if any)
 */
export function getActiveCheckpoint(
  projectId: string,
  db?: Database
): WorkflowState | null {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM workflow_checkpoints
    WHERE project_id = ?
    AND status IN ('running', 'waiting_user', 'paused')
    ORDER BY last_activity_at DESC
    LIMIT 1
  `);

  const row = stmt.get(projectId) as CheckpointRow | null;

  if (!row) {
    return null;
  }

  return rowToWorkflowState(row);
}

/**
 * Update checkpoint status
 */
export function updateCheckpointStatus(
  sessionId: string,
  status: WorkflowState['status'],
  error?: string,
  db?: Database
): void {
  const database = db || getDatabase();

  const now = new Date().toISOString();

  if (status === 'paused') {
    const stmt = database.prepare(`
      UPDATE workflow_checkpoints
      SET status = ?, paused_at = ?, last_activity_at = ?
      WHERE session_id = ?
    `);
    stmt.run(status, now, now, sessionId);
  } else if (status === 'completed') {
    const stmt = database.prepare(`
      UPDATE workflow_checkpoints
      SET status = ?, completed_at = ?, last_activity_at = ?
      WHERE session_id = ?
    `);
    stmt.run(status, now, now, sessionId);
  } else if (status === 'failed') {
    const stmt = database.prepare(`
      UPDATE workflow_checkpoints
      SET status = ?, last_error = ?, last_activity_at = ?
      WHERE session_id = ?
    `);
    stmt.run(status, error || null, now, sessionId);
  } else {
    const stmt = database.prepare(`
      UPDATE workflow_checkpoints
      SET status = ?, last_activity_at = ?
      WHERE session_id = ?
    `);
    stmt.run(status, now, sessionId);
  }
}

/**
 * Convert database row to WorkflowState
 */
function rowToWorkflowState(row: CheckpointRow): WorkflowState {
  return {
    sessionId: row.session_id,
    projectId: row.project_id,
    workflowId: row.workflow_id as WorkflowState['workflowId'],
    currentStepId: row.current_step_id,
    status: row.status as WorkflowState['status'],
    currentTopicIndex: row.current_topic_index,
    currentQuestionIndex: row.current_question_index,
    topicQuestionCounts: JSON.parse(row.topic_question_counts || '{}'),
    answers: JSON.parse(row.answers || '{}'),
    skippedQuestions: JSON.parse(row.skipped_questions || '[]'),
    data: JSON.parse(row.data || '{}'),
    clarifyState: row.clarify_state ? JSON.parse(row.clarify_state) : null,
    stepHistory: JSON.parse(row.step_history || '[]'),
    checkpoint: row.checkpoint || '',
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    pausedAt: row.paused_at,
    completedAt: row.completed_at,
    lastError: row.last_error,
    retryCount: row.retry_count,
  };
}
