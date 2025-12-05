/**
 * DatabaseService implementation
 * Handles all SQLite database operations
 */

import type { Database } from 'bun:sqlite';
import { getDatabase, closeDatabase } from '@/lib/db/client';
import type { WorkflowState } from '@/types/workflow/state';
import type { StepExecution } from '@/types/workflow/step';
import {
  saveCheckpoint,
  getCheckpoint,
  listCheckpoints,
  deleteCheckpoint,
  getActiveCheckpoint,
  updateCheckpointStatus,
} from '@/lib/db/queries/checkpoints';
import {
  recordDecision,
  getDecisions,
  getDecision,
  undoDecisions,
  getDecisionsByCascadeGroup,
  type Decision,
  type DecisionFilters,
} from '@/lib/db/queries/decisions';
import {
  recordHistory,
  getHistory,
  getLatestVersion,
  getProjectHistory,
  getHistoryBySession,
  type HistoryEntry,
} from '@/lib/db/queries/history';
import {
  createAnnotation,
  getAnnotations,
  getAnnotationsByStatus,
  updateAnnotation,
  deleteAnnotation,
  type Annotation,
} from '@/lib/db/queries/annotations';
import {
  recordUndo,
  getUndoStack,
  getRedoStack,
  markAsUndone,
  markAsRedone,
  getActionsForTarget,
  clearRedoStack,
  type UndoAction,
} from '@/lib/db/queries/undo';
import {
  saveAnalysisResults,
  getAnalysisResults,
  getLatestAnalysis,
  deleteExpiredAnalysis,
  deleteAnalysisResults,
  type AnalysisResults,
} from '@/lib/db/queries/analysis';

/**
 * DatabaseService interface
 */
export interface IDatabaseService {
  // Checkpoint operations
  saveCheckpoint(checkpoint: WorkflowState): Promise<void>;
  getCheckpoint(sessionId: string): Promise<WorkflowState | null>;
  listCheckpoints(projectId: string): Promise<WorkflowState[]>;
  deleteCheckpoint(sessionId: string): Promise<void>;
  getActiveCheckpoint(projectId: string): Promise<WorkflowState | null>;
  updateCheckpointStatus(
    sessionId: string,
    status: WorkflowState['status'],
    error?: string
  ): Promise<void>;

  // Step execution operations (for detailed logging)
  recordStepExecution(execution: StepExecution): Promise<void>;
  getStepExecutions(checkpointId: string): Promise<StepExecution[]>;

  // Decision operations
  recordDecision(decision: Decision): Promise<void>;
  getDecisions(
    projectId: string,
    filters?: DecisionFilters
  ): Promise<Decision[]>;
  getDecision(decisionId: string): Promise<Decision | null>;
  undoDecisions(decisionIds: string[], undoneBy?: string): Promise<void>;
  getDecisionsByCascadeGroup(cascadeGroup: string): Promise<Decision[]>;

  // History operations
  recordHistory(entry: HistoryEntry): Promise<void>;
  getHistory(artifactType: string, artifactId: string): Promise<HistoryEntry[]>;
  getLatestVersion(artifactType: string, artifactId: string): Promise<number>;
  getProjectHistory(projectId: string, limit?: number): Promise<HistoryEntry[]>;
  getHistoryBySession(sessionId: string): Promise<HistoryEntry[]>;

  // Annotation operations
  createAnnotation(annotation: Annotation): Promise<void>;
  getAnnotations(
    artifactType: string,
    artifactId: string
  ): Promise<Annotation[]>;
  getAnnotationsByStatus(
    projectId: string,
    status: 'open' | 'resolved' | 'dismissed'
  ): Promise<Annotation[]>;
  updateAnnotation(id: string, updates: Partial<Annotation>): Promise<void>;
  deleteAnnotation(id: string): Promise<void>;

  // Undo operations
  recordUndo(action: UndoAction): Promise<void>;
  getUndoStack(projectId: string): Promise<UndoAction[]>;
  getRedoStack(projectId: string): Promise<UndoAction[]>;
  markAsUndone(id: string): Promise<void>;
  markAsRedone(id: string): Promise<void>;
  getActionsForTarget(targetType: string, targetId: string): Promise<UndoAction[]>;
  clearRedoStack(projectId: string): Promise<void>;

  // Analysis operations
  saveAnalysisResults(results: AnalysisResults): Promise<void>;
  getAnalysisResults(
    projectId: string,
    scope?: string
  ): Promise<AnalysisResults[]>;
  getLatestAnalysis(
    projectId: string,
    scope: string
  ): Promise<AnalysisResults | null>;
  deleteExpiredAnalysis(): Promise<void>;
  deleteAnalysisResults(projectId: string): Promise<void>;

  // Database management
  close(): void;
}

/**
 * DatabaseService implementation
 */
export class DatabaseService implements IDatabaseService {
  private db: Database;

  constructor(dbPath?: string) {
    this.db = getDatabase(dbPath);
  }

  // Checkpoint operations
  async saveCheckpoint(checkpoint: WorkflowState): Promise<void> {
    saveCheckpoint(checkpoint, this.db);
  }

  async getCheckpoint(sessionId: string): Promise<WorkflowState | null> {
    return getCheckpoint(sessionId, this.db);
  }

  async listCheckpoints(projectId: string): Promise<WorkflowState[]> {
    return listCheckpoints(projectId, this.db);
  }

  async deleteCheckpoint(sessionId: string): Promise<void> {
    deleteCheckpoint(sessionId, this.db);
  }

  async getActiveCheckpoint(projectId: string): Promise<WorkflowState | null> {
    return getActiveCheckpoint(projectId, this.db);
  }

  async updateCheckpointStatus(
    sessionId: string,
    status: WorkflowState['status'],
    error?: string
  ): Promise<void> {
    updateCheckpointStatus(sessionId, status, error, this.db);
  }

  // Step execution operations
  async recordStepExecution(execution: StepExecution): Promise<void> {
    // Step executions are stored in step_history array in checkpoint
    // This method is for detailed logging to step_executions table
    const stmt = this.db.prepare(`
      INSERT INTO step_executions (
        id,
        checkpoint_id,
        step_id,
        step_type,
        status,
        started_at,
        completed_at,
        input_data,
        output_data,
        error,
        llm_tokens_used,
        duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      execution.id,
      execution.checkpointId,
      execution.stepId,
      execution.stepType,
      execution.status,
      execution.startedAt,
      execution.completedAt || null,
      execution.inputData ? JSON.stringify(execution.inputData) : null,
      execution.outputData ? JSON.stringify(execution.outputData) : null,
      execution.error || null,
      execution.llmTokensUsed || null,
      execution.durationMs
    );
  }

  async getStepExecutions(checkpointId: string): Promise<StepExecution[]> {
    interface StepExecutionRow {
      id: string;
      checkpoint_id: string;
      step_id: string;
      step_type: string;
      status: string;
      started_at: string;
      completed_at: string | null;
      input_data: string | null;
      output_data: string | null;
      error: string | null;
      llm_tokens_used: number | null;
      duration_ms: number;
    }

    const stmt = this.db.prepare(`
      SELECT * FROM step_executions
      WHERE checkpoint_id = ?
      ORDER BY started_at ASC
    `);

    const rows = stmt.all(checkpointId) as StepExecutionRow[];

    return rows.map((row) => ({
      id: row.id,
      checkpointId: row.checkpoint_id,
      stepId: row.step_id,
      stepType: row.step_type as StepExecution['stepType'],
      status: row.status as StepExecution['status'],
      startedAt: row.started_at,
      completedAt: row.completed_at,
      inputData: row.input_data ? JSON.parse(row.input_data) : undefined,
      outputData: row.output_data ? JSON.parse(row.output_data) : undefined,
      error: row.error,
      llmTokensUsed: row.llm_tokens_used,
      durationMs: row.duration_ms,
    }));
  }

  // Decision operations
  async recordDecision(decision: Decision): Promise<void> {
    recordDecision(decision, this.db);
  }

  async getDecisions(
    projectId: string,
    filters?: DecisionFilters
  ): Promise<Decision[]> {
    return getDecisions(projectId, filters, this.db);
  }

  async getDecision(decisionId: string): Promise<Decision | null> {
    return getDecision(decisionId, this.db);
  }

  async undoDecisions(
    decisionIds: string[],
    undoneBy?: string
  ): Promise<void> {
    undoDecisions(decisionIds, undoneBy, this.db);
  }

  async getDecisionsByCascadeGroup(cascadeGroup: string): Promise<Decision[]> {
    return getDecisionsByCascadeGroup(cascadeGroup, this.db);
  }

  // History operations
  async recordHistory(entry: HistoryEntry): Promise<void> {
    recordHistory(entry, this.db);
  }

  async getHistory(
    artifactType: string,
    artifactId: string
  ): Promise<HistoryEntry[]> {
    return getHistory(artifactType, artifactId, this.db);
  }

  async getLatestVersion(
    artifactType: string,
    artifactId: string
  ): Promise<number> {
    return getLatestVersion(artifactType, artifactId, this.db);
  }

  async getProjectHistory(
    projectId: string,
    limit?: number
  ): Promise<HistoryEntry[]> {
    return getProjectHistory(projectId, limit, this.db);
  }

  async getHistoryBySession(sessionId: string): Promise<HistoryEntry[]> {
    return getHistoryBySession(sessionId, this.db);
  }

  // Annotation operations
  async createAnnotation(annotation: Annotation): Promise<void> {
    createAnnotation(annotation, this.db);
  }

  async getAnnotations(
    artifactType: string,
    artifactId: string
  ): Promise<Annotation[]> {
    return getAnnotations(artifactType, artifactId, this.db);
  }

  async getAnnotationsByStatus(
    projectId: string,
    status: 'open' | 'resolved' | 'dismissed'
  ): Promise<Annotation[]> {
    return getAnnotationsByStatus(projectId, status, this.db);
  }

  async updateAnnotation(
    id: string,
    updates: Partial<Annotation>
  ): Promise<void> {
    updateAnnotation(id, updates, this.db);
  }

  async deleteAnnotation(id: string): Promise<void> {
    deleteAnnotation(id, this.db);
  }

  // Undo operations
  async recordUndo(action: UndoAction): Promise<void> {
    recordUndo(action, this.db);
  }

  async getUndoStack(projectId: string): Promise<UndoAction[]> {
    return getUndoStack(projectId, this.db);
  }

  async getRedoStack(projectId: string): Promise<UndoAction[]> {
    return getRedoStack(projectId, this.db);
  }

  async markAsUndone(id: string): Promise<void> {
    markAsUndone(id, this.db);
  }

  async markAsRedone(id: string): Promise<void> {
    markAsRedone(id, this.db);
  }

  async getActionsForTarget(
    targetType: string,
    targetId: string
  ): Promise<UndoAction[]> {
    return getActionsForTarget(targetType, targetId, this.db);
  }

  async clearRedoStack(projectId: string): Promise<void> {
    clearRedoStack(projectId, this.db);
  }

  // Analysis operations
  async saveAnalysisResults(results: AnalysisResults): Promise<void> {
    saveAnalysisResults(results, this.db);
  }

  async getAnalysisResults(
    projectId: string,
    scope?: string
  ): Promise<AnalysisResults[]> {
    return getAnalysisResults(projectId, scope, this.db);
  }

  async getLatestAnalysis(
    projectId: string,
    scope: string
  ): Promise<AnalysisResults | null> {
    return getLatestAnalysis(projectId, scope, this.db);
  }

  async deleteExpiredAnalysis(): Promise<void> {
    deleteExpiredAnalysis(this.db);
  }

  async deleteAnalysisResults(projectId: string): Promise<void> {
    deleteAnalysisResults(projectId, this.db);
  }

  // Database management
  close(): void {
    closeDatabase();
  }

  /**
   * Run operations in a transaction
   */
  async transaction<T>(fn: (db: Database) => Promise<T> | T): Promise<T> {
    // Begin transaction
    this.db.run('BEGIN');

    try {
      // Execute operations
      const result = await Promise.resolve(fn(this.db));

      // Commit transaction
      this.db.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Run multiple checkpoint operations in a transaction
   */
  async saveCheckpointWithHistory(
    checkpoint: WorkflowState,
    historyEntry?: HistoryEntry
  ): Promise<void> {
    await this.transaction(async () => {
      // Save checkpoint
      await this.saveCheckpoint(checkpoint);

      // Save history entry if provided
      if (historyEntry) {
        await this.recordHistory(historyEntry);
      }
    });
  }

  /**
   * Run multiple spec operations in a transaction
   * This is a helper for complex operations that need atomicity
   */
  async runInTransaction<T>(operations: () => Promise<T>): Promise<T> {
    return this.transaction(async () => {
      return await operations();
    });
  }
}

/**
 * Create singleton instance
 */
let databaseServiceInstance: DatabaseService | null = null;

export function getDatabaseService(dbPath?: string): DatabaseService {
  if (!databaseServiceInstance) {
    databaseServiceInstance = new DatabaseService(dbPath);
  }
  return databaseServiceInstance;
}
