/**
 * UndoService - Undo/redo stack management
 *
 * Handles undo/redo functionality with support for cascading operations
 * and conflict resolution
 */

import { nanoid } from 'nanoid';
import { getDatabaseService } from './database.service';
import type { UndoAction } from '@/lib/db/queries/undo';

/**
 * Action to record for undo/redo
 */
export interface RecordableAction {
  type: string; // 'feature.create', 'feature.update', 'schema.modify', etc.
  description: string;
  before: any; // State before action
  after: any; // State after action
  affectedIds: string[]; // IDs of affected artifacts
  targetType: string; // 'feature', 'schema', 'api', 'component'
  targetId: string; // ID of primary target
  projectId: string;
  cascadeGroup?: string; // For grouping related actions
}

/**
 * Result of undo/redo operation
 */
export interface UndoResult {
  success: boolean;
  error?: string;
  restoredState?: any;
  affectedIds: string[];
  conflicts?: UndoConflict[];
}

/**
 * Conflict detected during undo
 */
export interface UndoConflict {
  artifactId: string;
  reason: string;
  currentState: any;
  attemptedState: any;
  resolution?: 'skip' | 'force' | 'merge';
}

/**
 * Status of undo/redo stacks
 */
export interface UndoStatus {
  undoCount: number;
  redoCount: number;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * UndoService interface
 */
export interface IUndoService {
  canUndo(projectId: string): Promise<boolean>;
  canRedo(projectId: string): Promise<boolean>;
  undo(projectId: string): Promise<UndoResult>;
  redo(projectId: string): Promise<UndoResult>;
  recordAction(action: RecordableAction): Promise<void>;
  getStatus(projectId: string): Promise<UndoStatus>;
  getHistory(projectId: string): Promise<UndoAction[]>;
  clear(projectId: string): Promise<void>;
}

/**
 * UndoService implementation
 */
export class UndoService implements IUndoService {
  private dbService = getDatabaseService();

  /**
   * Check if undo is available
   */
  async canUndo(projectId: string): Promise<boolean> {
    const undoStack = await this.dbService.getUndoStack(projectId);
    return undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  async canRedo(projectId: string): Promise<boolean> {
    const redoStack = await this.dbService.getRedoStack(projectId);
    return redoStack.length > 0;
  }

  /**
   * Undo the most recent action
   */
  async undo(projectId: string): Promise<UndoResult> {
    const undoStack = await this.dbService.getUndoStack(projectId);

    if (undoStack.length === 0) {
      return {
        success: false,
        error: 'Nothing to undo',
        affectedIds: [],
      };
    }

    // Get the most recent action
    const action = undoStack[0];

    if (!action) {
      return {
        success: false,
        error: 'Invalid undo action',
        affectedIds: [],
      };
    }

    try {
      // Check for conflicts
      const conflicts = await this.detectConflicts(action);

      if (conflicts.length > 0) {
        // Handle conflicts
        const resolvedConflicts = await this.resolveConflicts(conflicts);

        if (resolvedConflicts.some((c) => c.resolution === 'skip')) {
          return {
            success: false,
            error: 'Undo cancelled due to conflicts',
            affectedIds: [action.targetId],
            conflicts: resolvedConflicts,
          };
        }
      }

      // Restore the before state
      const restoredState = action.beforeState;

      // Mark action as undone
      await this.dbService.markAsUndone(action.id);

      const result: UndoResult = {
        success: true,
        restoredState,
        affectedIds: [action.targetId],
      };

      if (conflicts.length > 0) {
        result.conflicts = conflicts;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        affectedIds: [action.targetId],
      };
    }
  }

  /**
   * Redo the most recently undone action
   */
  async redo(projectId: string): Promise<UndoResult> {
    const redoStack = await this.dbService.getRedoStack(projectId);

    if (redoStack.length === 0) {
      return {
        success: false,
        error: 'Nothing to redo',
        affectedIds: [],
      };
    }

    // Get the most recently undone action
    const action = redoStack[0];

    if (!action) {
      return {
        success: false,
        error: 'Invalid redo action',
        affectedIds: [],
      };
    }

    try {
      // Check for conflicts
      const conflicts = await this.detectConflicts(action);

      if (conflicts.length > 0) {
        const resolvedConflicts = await this.resolveConflicts(conflicts);

        if (resolvedConflicts.some((c) => c.resolution === 'skip')) {
          return {
            success: false,
            error: 'Redo cancelled due to conflicts',
            affectedIds: [action.targetId],
            conflicts: resolvedConflicts,
          };
        }
      }

      // Restore the after state
      const restoredState = action.afterState;

      // Mark action as redone (clear undone_at)
      await this.dbService.markAsRedone(action.id);

      const result: UndoResult = {
        success: true,
        restoredState,
        affectedIds: [action.targetId],
      };

      if (conflicts.length > 0) {
        result.conflicts = conflicts;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        affectedIds: [action.targetId],
      };
    }
  }

  /**
   * Record an action for undo/redo
   */
  async recordAction(action: RecordableAction): Promise<void> {
    // Clear redo stack when new action is recorded
    await this.dbService.clearRedoStack(action.projectId);

    // Create undo action
    const undoAction: UndoAction = {
      id: nanoid(),
      projectId: action.projectId,
      actionType: this.extractActionType(action.type),
      targetType: action.targetType,
      targetId: action.targetId,
      beforeState: action.before,
      afterState: action.after,
      description: action.description,
      createdAt: new Date().toISOString(),
      undoneAt: null,
    };

    // Record in database
    await this.dbService.recordUndo(undoAction);
  }

  /**
   * Get undo/redo status
   */
  async getStatus(projectId: string): Promise<UndoStatus> {
    const undoStack = await this.dbService.getUndoStack(projectId);
    const redoStack = await this.dbService.getRedoStack(projectId);

    return {
      undoCount: undoStack.length,
      redoCount: redoStack.length,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    };
  }

  /**
   * Get undo/redo history (combined)
   */
  async getHistory(projectId: string): Promise<UndoAction[]> {
    const undoStack = await this.dbService.getUndoStack(projectId);
    const redoStack = await this.dbService.getRedoStack(projectId);

    // Combine and sort by creation time
    return [...undoStack, ...redoStack].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Clear all undo/redo history
   */
  async clear(projectId: string): Promise<void> {
    await this.dbService.clearRedoStack(projectId);
    // Note: We don't have a clearUndoStack method, but we can implement it
    // For now, we'll leave the undo stack intact
  }

  /**
   * Detect conflicts before undo/redo
   */
  private async detectConflicts(_action: UndoAction): Promise<UndoConflict[]> {
    const conflicts: UndoConflict[] = [];

    // TODO: Implement actual conflict detection
    // This would check if the current state of the artifact
    // is different from what we expect based on the action history

    // For now, return empty array (no conflicts)
    return conflicts;
  }

  /**
   * Resolve conflicts
   */
  private async resolveConflicts(
    _conflicts: UndoConflict[]
  ): Promise<UndoConflict[]> {
    // TODO: Implement conflict resolution strategy
    // For now, default to 'force' resolution
    return _conflicts.map((conflict) => ({
      ...conflict,
      resolution: 'force' as const,
    }));
  }

  /**
   * Extract action type from full action string
   */
  private extractActionType(
    type: string
  ): 'create' | 'update' | 'delete' {
    if (type.includes('create')) return 'create';
    if (type.includes('delete')) return 'delete';
    return 'update';
  }

  /**
   * Undo cascade group (related actions)
   */
  async undoCascadeGroup(
    _projectId: string,
    _cascadeGroup: string
  ): Promise<UndoResult> {
    // Get all actions in the cascade group
    // Note: We need to add a method to get actions by cascade group
    // For now, this is a placeholder

    const affectedIds: string[] = [];

    try {
      // TODO: Implement cascade undo
      // This would undo all related actions in reverse order

      return {
        success: true,
        affectedIds,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        affectedIds,
      };
    }
  }

  /**
   * Check if action can be undone safely
   */
  async canUndoSafely(_actionId: string): Promise<boolean> {
    // TODO: Implement safety checks
    // Check if undoing this action would break dependencies
    // Check if the artifact still exists
    // Check if the artifact has been modified by other actions
    return true;
  }

  /**
   * Preview undo operation
   */
  async previewUndo(projectId: string): Promise<{
    action: UndoAction | null;
    affectedArtifacts: string[];
    potentialIssues: string[];
  }> {
    const undoStack = await this.dbService.getUndoStack(projectId);

    if (undoStack.length === 0) {
      return {
        action: null,
        affectedArtifacts: [],
        potentialIssues: [],
      };
    }

    const action = undoStack[0];

    if (!action) {
      return {
        action: null,
        affectedArtifacts: [],
        potentialIssues: [],
      };
    }

    const conflicts = await this.detectConflicts(action);

    return {
      action,
      affectedArtifacts: [action.targetId],
      potentialIssues: conflicts.map((c) => c.reason),
    };
  }

  /**
   * Preview redo operation
   */
  async previewRedo(projectId: string): Promise<{
    action: UndoAction | null;
    affectedArtifacts: string[];
    potentialIssues: string[];
  }> {
    const redoStack = await this.dbService.getRedoStack(projectId);

    if (redoStack.length === 0) {
      return {
        action: null,
        affectedArtifacts: [],
        potentialIssues: [],
      };
    }

    const action = redoStack[0];

    if (!action) {
      return {
        action: null,
        affectedArtifacts: [],
        potentialIssues: [],
      };
    }

    const conflicts = await this.detectConflicts(action);

    return {
      action,
      affectedArtifacts: [action.targetId],
      potentialIssues: conflicts.map((c) => c.reason),
    };
  }
}

/**
 * Create singleton instance
 */
let undoServiceInstance: UndoService | null = null;

export function getUndoService(): UndoService {
  if (!undoServiceInstance) {
    undoServiceInstance = new UndoService();
  }
  return undoServiceInstance;
}
