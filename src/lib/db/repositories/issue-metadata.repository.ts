/**
 * Issue Metadata Repository
 *
 * Database operations for issue metadata and execution history.
 * Manages Foundry-specific data for GitHub issues.
 */

import { eq, and, desc } from 'drizzle-orm';
import { getDatabase } from '../client';
import {
  issueMetadata,
  issueExecutions,
  type IssueMetadata,
  type NewIssueMetadata,
  type IssueExecution,
  type NewIssueExecution,
  type ExecutionResult,
} from '../schema';

// ============================================================================
// Issue Metadata CRUD
// ============================================================================

/**
 * Create or update issue metadata by unique key (project, owner, repo, issue number)
 */
export async function upsertIssueMetadata(
  data: NewIssueMetadata
): Promise<IssueMetadata> {
  const db = getDatabase();

  // Try to find existing by unique constraint
  const existing = await getIssueMetadataByIssue(
    data.projectId,
    data.owner,
    data.repo,
    data.issueNumber
  );

  if (existing) {
    // Update existing
    const [updated] = await db
      .update(issueMetadata)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(issueMetadata.id, existing.id))
      .returning();
    if (!updated) {
      throw new Error('Failed to update issue metadata');
    }
    return updated;
  }

  // Create new
  const [created] = await db.insert(issueMetadata).values(data).returning();
  if (!created) {
    throw new Error('Failed to create issue metadata');
  }
  return created;
}

/**
 * Get issue metadata by ID
 */
export async function getIssueMetadata(
  id: string
): Promise<IssueMetadata | undefined> {
  const db = getDatabase();
  const [metadata] = await db
    .select()
    .from(issueMetadata)
    .where(eq(issueMetadata.id, id))
    .limit(1);
  return metadata;
}

/**
 * Get issue metadata by unique issue identifier
 */
export async function getIssueMetadataByIssue(
  projectId: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueMetadata | undefined> {
  const db = getDatabase();
  const [metadata] = await db
    .select()
    .from(issueMetadata)
    .where(
      and(
        eq(issueMetadata.projectId, projectId),
        eq(issueMetadata.owner, owner),
        eq(issueMetadata.repo, repo),
        eq(issueMetadata.issueNumber, issueNumber)
      )
    )
    .limit(1);
  return metadata;
}

/**
 * List issue metadata for a project with optional status filter
 */
export async function listIssueMetadata(
  projectId: string,
  options?: { status?: string }
): Promise<IssueMetadata[]> {
  const db = getDatabase();

  const conditions = [eq(issueMetadata.projectId, projectId)];

  if (options?.status) {
    conditions.push(eq(issueMetadata.currentStatus, options.status));
  }

  return db
    .select()
    .from(issueMetadata)
    .where(and(...conditions))
    .orderBy(desc(issueMetadata.updatedAt));
}

/**
 * Update AI-generated plan content
 */
export async function updatePlanContent(
  id: string,
  plan: Record<string, unknown>
): Promise<IssueMetadata> {
  const db = getDatabase();
  const [metadata] = await db
    .update(issueMetadata)
    .set({ planContent: plan, updatedAt: new Date() })
    .where(eq(issueMetadata.id, id))
    .returning();
  if (!metadata) {
    throw new Error('Issue metadata not found');
  }
  return metadata;
}

/**
 * Update custom fields
 */
export async function updateCustomFields(
  id: string,
  fields: Record<string, unknown>
): Promise<IssueMetadata> {
  const db = getDatabase();
  const [metadata] = await db
    .update(issueMetadata)
    .set({ customFields: fields, updatedAt: new Date() })
    .where(eq(issueMetadata.id, id))
    .returning();
  if (!metadata) {
    throw new Error('Issue metadata not found');
  }
  return metadata;
}

/**
 * Update current status
 */
export async function updateCurrentStatus(
  id: string,
  status: string
): Promise<IssueMetadata> {
  const db = getDatabase();
  const [metadata] = await db
    .update(issueMetadata)
    .set({ currentStatus: status, lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(issueMetadata.id, id))
    .returning();
  if (!metadata) {
    throw new Error('Issue metadata not found');
  }
  return metadata;
}

/**
 * Delete issue metadata
 * Note: Cascades to issue_executions
 */
export async function deleteIssueMetadata(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(issueMetadata).where(eq(issueMetadata.id, id));
}

// ============================================================================
// Issue Executions
// ============================================================================

/**
 * Create a new execution record
 */
export async function createExecution(
  data: NewIssueExecution
): Promise<IssueExecution> {
  const db = getDatabase();
  const [execution] = await db.insert(issueExecutions).values(data).returning();
  if (!execution) {
    throw new Error('Failed to create execution');
  }
  return execution;
}

/**
 * Complete an execution with result
 */
export async function completeExecution(
  id: string,
  result: ExecutionResult,
  nextStatus?: string,
  error?: string
): Promise<IssueExecution> {
  const db = getDatabase();
  const [execution] = await db
    .update(issueExecutions)
    .set({
      result,
      nextStatusApplied: nextStatus,
      errorMessage: error,
      completedAt: new Date(),
    })
    .where(eq(issueExecutions.id, id))
    .returning();
  if (!execution) {
    throw new Error('Execution not found');
  }
  return execution;
}

/**
 * Get execution by ID
 */
export async function getExecution(
  id: string
): Promise<IssueExecution | undefined> {
  const db = getDatabase();
  const [execution] = await db
    .select()
    .from(issueExecutions)
    .where(eq(issueExecutions.id, id))
    .limit(1);
  return execution;
}

/**
 * List all executions for an issue
 */
export async function listExecutions(
  issueMetadataId: string
): Promise<IssueExecution[]> {
  const db = getDatabase();
  return db
    .select()
    .from(issueExecutions)
    .where(eq(issueExecutions.issueMetadataId, issueMetadataId))
    .orderBy(desc(issueExecutions.startedAt));
}

/**
 * Get recent executions across a project
 */
export async function getRecentExecutions(
  projectId: string,
  limit = 50
): Promise<IssueExecution[]> {
  const db = getDatabase();
  return db
    .select({
      id: issueExecutions.id,
      issueMetadataId: issueExecutions.issueMetadataId,
      workflowExecutionId: issueExecutions.workflowExecutionId,
      automationId: issueExecutions.automationId,
      triggeredBy: issueExecutions.triggeredBy,
      triggerStatus: issueExecutions.triggerStatus,
      fromStatus: issueExecutions.fromStatus,
      result: issueExecutions.result,
      nextStatusApplied: issueExecutions.nextStatusApplied,
      errorMessage: issueExecutions.errorMessage,
      startedAt: issueExecutions.startedAt,
      completedAt: issueExecutions.completedAt,
    })
    .from(issueExecutions)
    .innerJoin(issueMetadata, eq(issueExecutions.issueMetadataId, issueMetadata.id))
    .where(eq(issueMetadata.projectId, projectId))
    .orderBy(desc(issueExecutions.startedAt))
    .limit(limit);
}

/**
 * Get the latest execution for an issue
 */
export async function getLatestExecution(
  issueMetadataId: string
): Promise<IssueExecution | undefined> {
  const db = getDatabase();
  const [execution] = await db
    .select()
    .from(issueExecutions)
    .where(eq(issueExecutions.issueMetadataId, issueMetadataId))
    .orderBy(desc(issueExecutions.startedAt))
    .limit(1);
  return execution;
}

// ============================================================================
// Re-export types
// ============================================================================

export type {
  IssueMetadata,
  NewIssueMetadata,
  IssueExecution,
  NewIssueExecution,
  ExecutionResult,
};
