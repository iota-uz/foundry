/**
 * Decision journal queries
 */

import type { Database } from 'bun:sqlite';
import { getDatabase } from '../client';
import { now } from '@/lib/utils';

/**
 * Decision record
 */
export interface Decision {
  id: string;
  projectId: string;
  featureId: string | null;
  sessionId: string;
  questionId: string;
  questionText: string;
  answerGiven: unknown;
  alternatives: unknown[] | null;
  category: string;
  phase: 'cpo' | 'clarify' | 'cto';
  batchId: string | null;
  artifactsAffected: unknown[] | null;
  specChanges: unknown[] | null;
  cascadeGroup: string | null;
  canUndo: boolean;
  undoneAt: string | null;
  undoneBy: string | null;
  aiRecommendation: unknown | null;
  recommendationFollowed: boolean | null;
  rationaleExplicit: string | null;
  rationaleInferred: string | null;
  rationaleConfidence: 'stated' | 'inferred' | 'unknown' | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Decision filters
 */
export interface DecisionFilters {
  featureId?: string;
  phase?: 'cpo' | 'clarify' | 'cto';
  category?: string;
  sessionId?: string;
  cascadeGroup?: string;
  undone?: boolean;
}

interface DecisionRow {
  id: string;
  project_id: string;
  feature_id: string | null;
  session_id: string;
  question_id: string;
  question_text: string;
  answer_given: string;
  alternatives: string | null;
  category: string;
  phase: string;
  batch_id: string | null;
  artifacts_affected: string | null;
  spec_changes: string | null;
  cascade_group: string | null;
  can_undo: number;
  undone_at: string | null;
  undone_by: string | null;
  ai_recommendation: string | null;
  recommendation_followed: number | null;
  rationale_explicit: string | null;
  rationale_inferred: string | null;
  rationale_confidence: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Record a decision
 */
export function recordDecision(decision: Decision, db?: Database): void {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    INSERT INTO decisions (
      id,
      project_id,
      feature_id,
      session_id,
      question_id,
      question_text,
      answer_given,
      alternatives,
      category,
      phase,
      batch_id,
      artifacts_affected,
      spec_changes,
      cascade_group,
      can_undo,
      undone_at,
      undone_by,
      ai_recommendation,
      recommendation_followed,
      rationale_explicit,
      rationale_inferred,
      rationale_confidence,
      created_at,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    decision.id,
    decision.projectId,
    decision.featureId,
    decision.sessionId,
    decision.questionId,
    decision.questionText,
    JSON.stringify(decision.answerGiven),
    decision.alternatives ? JSON.stringify(decision.alternatives) : null,
    decision.category,
    decision.phase,
    decision.batchId,
    decision.artifactsAffected
      ? JSON.stringify(decision.artifactsAffected)
      : null,
    decision.specChanges ? JSON.stringify(decision.specChanges) : null,
    decision.cascadeGroup,
    decision.canUndo ? 1 : 0,
    decision.undoneAt,
    decision.undoneBy,
    decision.aiRecommendation
      ? JSON.stringify(decision.aiRecommendation)
      : null,
    decision.recommendationFollowed !== null
      ? decision.recommendationFollowed
        ? 1
        : 0
      : null,
    decision.rationaleExplicit,
    decision.rationaleInferred,
    decision.rationaleConfidence,
    decision.createdAt,
    decision.updatedAt
  );
}

/**
 * Get decisions with filters
 */
export function getDecisions(
  projectId: string,
  filters?: DecisionFilters,
  db?: Database
): Decision[] {
  const database = db || getDatabase();

  let sql = `SELECT * FROM decisions WHERE project_id = ?`;
  const params: (string | number | boolean)[] = [projectId];

  if (filters?.featureId) {
    sql += ` AND feature_id = ?`;
    params.push(filters.featureId);
  }

  if (filters?.phase) {
    sql += ` AND phase = ?`;
    params.push(filters.phase);
  }

  if (filters?.category) {
    sql += ` AND category = ?`;
    params.push(filters.category);
  }

  if (filters?.sessionId) {
    sql += ` AND session_id = ?`;
    params.push(filters.sessionId);
  }

  if (filters?.cascadeGroup) {
    sql += ` AND cascade_group = ?`;
    params.push(filters.cascadeGroup);
  }

  if (filters?.undone !== undefined) {
    if (filters.undone) {
      sql += ` AND undone_at IS NOT NULL`;
    } else {
      sql += ` AND undone_at IS NULL`;
    }
  }

  sql += ` ORDER BY created_at DESC`;

  const stmt = database.prepare(sql);
  const rows = stmt.all(...params) as DecisionRow[];

  return rows.map(rowToDecision);
}

/**
 * Get a single decision by ID
 */
export function getDecision(
  decisionId: string,
  db?: Database
): Decision | null {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM decisions WHERE id = ?
  `);

  const row = stmt.get(decisionId) as DecisionRow | null;

  if (!row) {
    return null;
  }

  return rowToDecision(row);
}

/**
 * Mark decisions as undone
 */
export function undoDecisions(
  decisionIds: string[],
  undoneBy?: string,
  db?: Database
): void {
  const database = db || getDatabase();

  const timestamp = now();

  const stmt = database.prepare(`
    UPDATE decisions
    SET undone_at = ?, undone_by = ?, updated_at = ?
    WHERE id = ?
  `);

  for (const id of decisionIds) {
    stmt.run(timestamp, undoneBy || null, timestamp, id);
  }
}

/**
 * Get decisions in a cascade group
 */
export function getDecisionsByCascadeGroup(
  cascadeGroup: string,
  db?: Database
): Decision[] {
  const database = db || getDatabase();

  const stmt = database.prepare(`
    SELECT * FROM decisions
    WHERE cascade_group = ?
    AND undone_at IS NULL
    ORDER BY created_at ASC
  `);

  const rows = stmt.all(cascadeGroup) as DecisionRow[];

  return rows.map(rowToDecision);
}

/**
 * Convert database row to Decision
 */
function rowToDecision(row: DecisionRow): Decision {
  return {
    id: row.id,
    projectId: row.project_id,
    featureId: row.feature_id,
    sessionId: row.session_id,
    questionId: row.question_id,
    questionText: row.question_text,
    answerGiven: JSON.parse(row.answer_given),
    alternatives: row.alternatives ? JSON.parse(row.alternatives) : null,
    category: row.category,
    phase: row.phase as Decision['phase'],
    batchId: row.batch_id,
    artifactsAffected: row.artifacts_affected
      ? JSON.parse(row.artifacts_affected)
      : null,
    specChanges: row.spec_changes ? JSON.parse(row.spec_changes) : null,
    cascadeGroup: row.cascade_group,
    canUndo: row.can_undo === 1,
    undoneAt: row.undone_at,
    undoneBy: row.undone_by,
    aiRecommendation: row.ai_recommendation
      ? JSON.parse(row.ai_recommendation)
      : null,
    recommendationFollowed:
      row.recommendation_followed !== null
        ? row.recommendation_followed === 1
        : null,
    rationaleExplicit: row.rationale_explicit,
    rationaleInferred: row.rationale_inferred,
    rationaleConfidence: row.rationale_confidence as Decision['rationaleConfidence'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
