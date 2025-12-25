/**
 * Workflow Repository
 *
 * Database operations for workflows and executions.
 * Uses Drizzle ORM for type-safe queries.
 */

import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '../client';
import {
  workflows,
  workflowExecutions,
  executionLogs,
  type Workflow,
  type NewWorkflow,
  type WorkflowExecution,
  type NewWorkflowExecution,
  type ExecutionLog,
  type NewExecutionLog,
} from '../schema';

// ============================================================================
// Workflow CRUD
// ============================================================================

/**
 * Create a new workflow
 */
export async function createWorkflow(data: NewWorkflow): Promise<Workflow> {
  const db = getDatabase();
  const [workflow] = await db.insert(workflows).values(data).returning();
  if (!workflow) {
    throw new Error('Failed to create workflow');
  }
  return workflow;
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(id: string): Promise<Workflow | undefined> {
  const db = getDatabase();
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, id))
    .limit(1);
  return workflow;
}

/**
 * List all workflows, ordered by most recently updated
 */
export async function listWorkflows(): Promise<Workflow[]> {
  const db = getDatabase();
  return db.select().from(workflows).orderBy(desc(workflows.updatedAt));
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  id: string,
  data: Partial<NewWorkflow>
): Promise<Workflow> {
  const db = getDatabase();
  const [workflow] = await db
    .update(workflows)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(workflows.id, id))
    .returning();
  if (!workflow) {
    throw new Error('Workflow not found');
  }
  return workflow;
}

/**
 * Delete a workflow and all its executions
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(workflows).where(eq(workflows.id, id));
}

// ============================================================================
// Workflow Executions
// ============================================================================

/**
 * Create a new execution
 */
export async function createExecution(
  data: NewWorkflowExecution
): Promise<WorkflowExecution> {
  const db = getDatabase();
  const [execution] = await db
    .insert(workflowExecutions)
    .values(data)
    .returning();
  if (!execution) {
    throw new Error('Failed to create execution');
  }
  return execution;
}

/**
 * Get an execution by ID
 */
export async function getExecution(
  id: string
): Promise<WorkflowExecution | undefined> {
  const db = getDatabase();
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, id))
    .limit(1);
  return execution;
}

/**
 * List executions for a workflow
 */
export async function listExecutions(
  workflowId: string
): Promise<WorkflowExecution[]> {
  const db = getDatabase();
  return db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.workflowId, workflowId))
    .orderBy(desc(workflowExecutions.startedAt));
}

/**
 * Update an execution
 */
export async function updateExecution(
  id: string,
  data: Partial<NewWorkflowExecution>
): Promise<WorkflowExecution> {
  const db = getDatabase();
  const [execution] = await db
    .update(workflowExecutions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(workflowExecutions.id, id))
    .returning();
  if (!execution) {
    throw new Error('Execution not found');
  }
  return execution;
}

// ============================================================================
// Execution Logs
// ============================================================================

/**
 * Add a log entry
 */
export async function addLog(data: NewExecutionLog): Promise<ExecutionLog> {
  const db = getDatabase();
  const [log] = await db.insert(executionLogs).values(data).returning();
  if (!log) {
    throw new Error('Failed to create log');
  }
  return log;
}

/**
 * Get logs for an execution
 */
export async function getLogs(executionId: string): Promise<ExecutionLog[]> {
  const db = getDatabase();
  return db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.executionId, executionId))
    .orderBy(executionLogs.timestamp);
}

// ============================================================================
// Re-export types
// ============================================================================

export type {
  Workflow,
  NewWorkflow,
  WorkflowExecution,
  NewWorkflowExecution,
  ExecutionLog,
  NewExecutionLog,
};
