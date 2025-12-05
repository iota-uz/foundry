/**
 * Artifact history queries
 */

import type { Database } from 'bun:sqlite';
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

interface HistoryRow {
  id: string;
  project_id: string;
  artifact_type: string;
  artifact_id: string;
  version: number;
  change_type: string;
  changes: string;
  changed_by: string;
  session_id: string | null;
  created_at: string;
}

interface MaxVersionRow {
  max_version: number | null;
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

  const rows = stmt.all(artifactType, artifactId) as HistoryRow[];

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

  const row = stmt.get(artifactType, artifactId) as MaxVersionRow | null;

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
    ? (stmt.all(projectId, limit) as HistoryRow[])
    : (stmt.all(projectId) as HistoryRow[]);

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

  const rows = stmt.all(sessionId) as HistoryRow[];

  return rows.map(rowToHistoryEntry);
}

/**
 * Convert database row to HistoryEntry
 */
function rowToHistoryEntry(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    artifactType: row.artifact_type as HistoryEntry['artifactType'],
    artifactId: row.artifact_id,
    version: row.version,
    changeType: row.change_type as HistoryEntry['changeType'],
    changes: JSON.parse(row.changes),
    changedBy: row.changed_by,
    sessionId: row.session_id,
    createdAt: row.created_at,
  };
}
