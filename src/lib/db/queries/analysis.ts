/**
 * Analysis results queries
 */

import type { Database } from 'bun:sqlite';
import { getDatabase } from '../client';
import { isExpired } from '@/lib/utils';

/**
 * Analysis results record
 */
export interface AnalysisResults {
  id: string;
  projectId: string;
  scope: string;
  status: 'valid' | 'warnings' | 'errors';
  results: {
    errors?: number;
    warnings?: number;
    info?: number;
    issues?: Array<{
      severity: string;
      category: string;
      message: string;
      location?: { file: string; line?: number };
    }>;
  };
  createdAt: string;
  expiresAt: string | null;
}

interface AnalysisRow {
  id: string;
  project_id: string;
  scope: string;
  status: string;
  results: string;
  created_at: string;
  expires_at: string | null;
}

/**
 * Save analysis results
 */
export function saveAnalysisResults(
  results: AnalysisResults,
  db?: Database
): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO analysis_results (
      id,
      project_id,
      scope,
      status,
      results,
      created_at,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    results.id,
    results.projectId,
    results.scope,
    results.status,
    JSON.stringify(results.results),
    results.createdAt,
    results.expiresAt
  );
}

/**
 * Get analysis results
 */
export function getAnalysisResults(
  projectId: string,
  scope?: string,
  db?: Database
): AnalysisResults[] {
  const database = db || getDatabase();

  let sql = `
    SELECT * FROM analysis_results
    WHERE project_id = ?
  `;

  const params: (string | number)[] = [projectId];

  if (scope) {
    sql += ` AND scope = ?`;
    params.push(scope);
  }

  sql += ` ORDER BY created_at DESC`;

  const stmt = database.prepare(sql);
  const rows = stmt.all(...params) as AnalysisRow[];

  return rows
    .map(rowToAnalysisResults)
    .filter((r) => !r.expiresAt || !isExpired(r.expiresAt));
}

/**
 * Get latest analysis for a scope
 */
export function getLatestAnalysis(
  projectId: string,
  scope: string,
  db?: Database
): AnalysisResults | null {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM analysis_results
    WHERE project_id = ? AND scope = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const row = stmt.get(projectId, scope) as AnalysisRow | undefined;

  if (!row) {
    return null;
  }

  const results = rowToAnalysisResults(row);

  // Check expiration
  if (results.expiresAt && isExpired(results.expiresAt)) {
    return null;
  }

  return results;
}

/**
 * Delete expired analysis results
 */
export function deleteExpiredAnalysis(db?: Database): void {
  const database = db || getDatabase();

  const now = new Date().toISOString();

  const stmt = database.prepare(`
    DELETE FROM analysis_results
    WHERE expires_at IS NOT NULL AND expires_at < ?
  `);

  stmt.run(now);
}

/**
 * Delete analysis results for a project
 */
export function deleteAnalysisResults(projectId: string, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    DELETE FROM analysis_results WHERE project_id = ?
  `);

  stmt.run(projectId);
}

/**
 * Convert database row to AnalysisResults
 */
function rowToAnalysisResults(row: AnalysisRow): AnalysisResults {
  return {
    id: row.id,
    projectId: row.project_id,
    scope: row.scope,
    status: row.status as AnalysisResults['status'],
    results: JSON.parse(row.results),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}
