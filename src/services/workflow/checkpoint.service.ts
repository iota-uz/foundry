/**
 * CheckpointService - Manages workflow state checkpoints
 */

import type { WorkflowState } from '@/types/workflow/state';
import type { WorkflowContext } from '@/types/workflow/state';
import type { StepExecution } from '@/types/workflow/step';
import { getDatabaseService } from '@/services/core/database.service';

/**
 * CheckpointService handles saving, loading, and managing workflow checkpoints
 */
export class CheckpointService {
  private db = getDatabaseService();

  /**
   * Save workflow checkpoint to SQLite
   */
  async save(state: WorkflowState): Promise<void> {
    await this.db.saveCheckpoint(state);
  }

  /**
   * Load workflow checkpoint from SQLite
   */
  async load(sessionId: string): Promise<WorkflowState | null> {
    return await this.db.getCheckpoint(sessionId);
  }

  /**
   * Delete workflow checkpoint
   */
  async delete(sessionId: string): Promise<void> {
    await this.db.deleteCheckpoint(sessionId);
  }

  /**
   * Check if checkpoint exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const checkpoint = await this.load(sessionId);
    return checkpoint !== null;
  }

  /**
   * List all checkpoints for a project
   */
  async list(projectId: string): Promise<WorkflowState[]> {
    return await this.db.listCheckpoints(projectId);
  }

  /**
   * Get active checkpoint for a project
   */
  async getActive(projectId: string): Promise<WorkflowState | null> {
    return await this.db.getActiveCheckpoint(projectId);
  }

  /**
   * Update checkpoint status
   */
  async updateStatus(
    sessionId: string,
    status: WorkflowState['status'],
    error?: string
  ): Promise<void> {
    await this.db.updateCheckpointStatus(sessionId, status, error);
  }

  /**
   * Record step execution in detail
   */
  async recordStepExecution(execution: StepExecution): Promise<void> {
    await this.db.recordStepExecution(execution);
  }

  /**
   * Get step executions for a checkpoint
   */
  async getStepExecutions(checkpointId: string): Promise<StepExecution[]> {
    return await this.db.getStepExecutions(checkpointId);
  }

  /**
   * Create a checkpoint snapshot from context
   */
  createCheckpoint(
    context: WorkflowContext,
    currentStepId: string
  ): WorkflowState {
    return {
      ...context.state,
      currentStepId,
      lastActivityAt: new Date().toISOString(),
      checkpoint: this.generateCheckpointId(),
    };
  }

  /**
   * Generate unique checkpoint ID
   */
  private generateCheckpointId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Restore context from checkpoint
   */
  restoreContext(
    checkpoint: WorkflowState,
    constitution: unknown | null
  ): WorkflowContext {
    return {
      sessionId: checkpoint.sessionId,
      projectId: checkpoint.projectId,
      workflowId: checkpoint.workflowId,
      state: checkpoint,
      constitution,
    };
  }
}

/**
 * Singleton instance
 */
let checkpointServiceInstance: CheckpointService | null = null;

/**
 * Get or create CheckpointService instance
 */
export function getCheckpointService(): CheckpointService {
  if (!checkpointServiceInstance) {
    checkpointServiceInstance = new CheckpointService();
  }
  return checkpointServiceInstance;
}
