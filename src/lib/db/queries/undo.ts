/**
 * Undo/redo action queries
 */

import type { Database } from 'better-sqlite3';
import { getDatabase } from '../client';

/**
 * Undo action record
 */
export interface UndoAction {
  id: string;
  projectId: string;
  actionType: 'create' | 'update' | 'delete';
  targetType: string;
  targetId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  description: string;
  createdAt: string;
  undoneAt: string | null;
}

interface UndoActionRow {
  id: string;
  project_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  before_state: string | null;
  after_state: string | null;
  description: string;
  created_at: string;
  undone_at: string | null;
}

/**
 * Record an undo action
 */
export function recordUndo(action: UndoAction, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    INSERT INTO undo_actions (
      id,
      project_id,
      action_type,
      target_type,
      target_id,
      before_state,
      after_state,
      description,
      created_at,
      undone_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    action.id,
    action.projectId,
    action.actionType,
    action.targetType,
    action.targetId,
    action.beforeState ? JSON.stringify(action.beforeState) : null,
    action.afterState ? JSON.stringify(action.afterState) : null,
    action.description,
    action.createdAt,
    action.undoneAt
  );
}

/**
 * Get undo stack (actions not yet undone)
 */
export function getUndoStack(projectId: string, db?: Database): UndoAction[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM undo_actions
    WHERE project_id = ? AND undone_at IS NULL
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(projectId) as UndoActionRow[];

  return rows.map(rowToUndoAction);
}

/**
 * Get redo stack (actions that were undone)
 */
export function getRedoStack(projectId: string, db?: Database): UndoAction[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM undo_actions
    WHERE project_id = ? AND undone_at IS NOT NULL
    ORDER BY undone_at DESC
  `);

  const rows = stmt.all(projectId) as UndoActionRow[];

  return rows.map(rowToUndoAction);
}

/**
 * Mark an action as undone
 */
export function markAsUndone(id: string, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    UPDATE undo_actions
    SET undone_at = ?
    WHERE id = ?
  `);

  stmt.run(new Date().toISOString(), id);
}

/**
 * Mark an action as redone (clear undone_at)
 */
export function markAsRedone(id: string, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    UPDATE undo_actions
    SET undone_at = NULL
    WHERE id = ?
  `);

  stmt.run(id);
}

/**
 * Get actions for a specific target
 */
export function getActionsForTarget(
  targetType: string,
  targetId: string,
  db?: Database
): UndoAction[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM undo_actions
    WHERE target_type = ? AND target_id = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(targetType, targetId) as UndoActionRow[];

  return rows.map(rowToUndoAction);
}

/**
 * Clear redo stack (called after new action)
 */
export function clearRedoStack(projectId: string, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    DELETE FROM undo_actions
    WHERE project_id = ? AND undone_at IS NOT NULL
  `);

  stmt.run(projectId);
}

/**
 * Convert database row to UndoAction
 */
function rowToUndoAction(row: UndoActionRow): UndoAction {
  return {
    id: row.id,
    projectId: row.project_id,
    actionType: row.action_type,
    targetType: row.target_type,
    targetId: row.target_id,
    beforeState: row.before_state ? JSON.parse(row.before_state) : null,
    afterState: row.after_state ? JSON.parse(row.after_state) : null,
    description: row.description,
    createdAt: row.created_at,
    undoneAt: row.undone_at,
  };
}
