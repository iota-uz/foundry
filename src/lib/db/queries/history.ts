/**
 * Artifact history queries
 */

import type { Database } from 'better-sqlite3';
import { getDatabase } from '../client';

/**
 * History entry record
 */
export interface HistoryEntry {
  id: string;
  projectId: string;
  artifactType: 'feature' | 'schema' | 'api' | 'component';
  artifactId: string;
  version: number;
  changeType: 'created' | 'updated' | 'deleted';
  changes: unknown;
  changedBy: string;
  sessionId: string | null;
  createdAt: string;
}

/**
 * Record a history entry
 */
export function recordHistory(entry: HistoryEntry, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    INSERT INTO artifact_history (
      id,
      project_id,
      artifact_type,
      artifact_id,
      version,
      change_type,
      changes,
      changed_by,
      session_id,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    entry.id,
    entry.projectId,
    entry.artifactType,
    entry.artifactId,
    entry.version,
    entry.changeType,
    JSON.stringify(entry.changes),
    entry.changedBy,
    entry.sessionId,
    entry.createdAt
  );
}

/**
 * Get history for an artifact
 */
export function getHistory(
  artifactType: string,
  artifactId: string,
  db?: Database
): HistoryEntry[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM artifact_history
    WHERE artifact_type = ? AND artifact_id = ?
    ORDER BY version DESC
  `);

  const rows = stmt.all(...params) as unknown[];

  return rows.map(rowToHistoryEntry);
}

/**
 * Get latest version number for an artifact
 */
export function getLatestVersion(
  artifactType: string,
  artifactId: string,
  db?: Database
): number {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT MAX(version) as max_version
    FROM artifact_history
    WHERE artifact_type = ? AND artifact_id = ?
  `);

  const row = stmt.get(...params) as unknown;

  return row?.max_version || 0;
}

/**
 * Get all history for a project
 */
export function getProjectHistory(
  projectId: string,
  limit?: number,
  db?: Database
): HistoryEntry[] {
  const database = db || getDatabase();

  let sql = `
    SELECT * FROM artifact_history
    WHERE project_id = ?
    ORDER BY created_at DESC
  `;

  if (limit) {
    sql += ` LIMIT ?`;
  }

  const stmt = database.prepare(sql);
  const rows = limit
    ? (stmt.all(...params) as unknown[])
    : (stmt.all(...params) as unknown[]);

  return rows.map(rowToHistoryEntry);
}

/**
 * Get history by session
 */
export function getHistoryBySession(
  sessionId: string,
  db?: Database
): HistoryEntry[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM artifact_history
    WHERE session_id = ?
    ORDER BY created_at ASC
  `);

  const rows = stmt.all(...params) as unknown[];

  return rows.map(rowToHistoryEntry);
}

/**
 * Convert database row to HistoryEntry
 */
function rowToHistoryEntry(row: unknown): HistoryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    artifactType: row.artifact_type,
    artifactId: row.artifact_id,
    version: row.version,
    changeType: row.change_type,
    changes: JSON.parse(row.changes),
    changedBy: row.changed_by,
    sessionId: row.session_id,
    createdAt: row.created_at,
  };
}
