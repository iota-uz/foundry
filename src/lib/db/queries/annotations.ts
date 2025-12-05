/**
 * Annotation queries
 */

import type { Database } from 'bun:sqlite';
import { getDatabase } from '../client';

/**
 * Annotation record
 */
export interface Annotation {
  id: string;
  projectId: string;
  artifactType: 'feature' | 'schema' | 'api' | 'component';
  artifactId: string;
  artifactPath: string | null;
  content: string;
  author: 'user' | 'ai';
  annotationType: 'comment' | 'todo' | 'warning' | 'suggestion';
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface AnnotationRow {
  id: string;
  project_id: string;
  artifact_type: string;
  artifact_id: string;
  artifact_path: string | null;
  content: string;
  author: string;
  annotation_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

/**
 * Create an annotation
 */
export function createAnnotation(annotation: Annotation, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    INSERT INTO annotations (
      id,
      project_id,
      artifact_type,
      artifact_id,
      artifact_path,
      content,
      author,
      annotation_type,
      status,
      created_at,
      updated_at,
      resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    annotation.id,
    annotation.projectId,
    annotation.artifactType,
    annotation.artifactId,
    annotation.artifactPath,
    annotation.content,
    annotation.author,
    annotation.annotationType,
    annotation.status,
    annotation.createdAt,
    annotation.updatedAt,
    annotation.resolvedAt
  );
}

/**
 * Get annotations for an artifact
 */
export function getAnnotations(
  artifactType: string,
  artifactId: string,
  db?: Database
): Annotation[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM annotations
    WHERE artifact_type = ? AND artifact_id = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(artifactType, artifactId) as AnnotationRow[];

  return rows.map(rowToAnnotation);
}

/**
 * Get annotations by status
 */
export function getAnnotationsByStatus(
  projectId: string,
  status: 'open' | 'resolved' | 'dismissed',
  db?: Database
): Annotation[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM annotations
    WHERE project_id = ? AND status = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(projectId, status) as AnnotationRow[];

  return rows.map(rowToAnnotation);
}

/**
 * Update an annotation
 */
export function updateAnnotation(
  id: string,
  updates: Partial<Annotation>,
  db?: Database
): void {
  const database = db || getDatabase();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);

    if (updates.status === 'resolved') {
      fields.push('resolved_at = ?');
      values.push(new Date().toISOString());
    }
  }

  if (updates.annotationType !== undefined) {
    fields.push('annotation_type = ?');
    values.push(updates.annotationType);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  const sql = `
    UPDATE annotations
    SET ${fields.join(', ')}
    WHERE id = ?
  `;

  const stmt = database.prepare(sql);
  stmt.run(...values);
}

/**
 * Delete an annotation
 */
export function deleteAnnotation(id: string, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    DELETE FROM annotations WHERE id = ?
  `);

  stmt.run(id);
}

/**
 * Convert database row to Annotation
 */
function rowToAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    projectId: row.project_id,
    artifactType: row.artifact_type as Annotation['artifactType'],
    artifactId: row.artifact_id,
    artifactPath: row.artifact_path,
    content: row.content,
    author: row.author as Annotation['author'],
    annotationType: row.annotation_type as Annotation['annotationType'],
    status: row.status as Annotation['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}
