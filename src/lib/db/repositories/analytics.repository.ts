/**
 * Analytics Repository
 *
 * Database operations for workflow execution analytics and visualizations.
 * Provides aggregated statistics and node-level performance metrics.
 */

import { eq, desc, count, sql } from 'drizzle-orm';
import { getDatabase } from '../client';
import {
  workflows,
  workflowExecutions,
  type WorkflowExecution,
} from '../schema';

// ============================================================================
// Types
// ============================================================================

/**
 * Execution with workflow name (joined)
 */
export interface ExecutionWithWorkflow extends WorkflowExecution {
  workflowName: string;
}

/**
 * Execution statistics aggregated across all workflows
 */
export interface ExecutionStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  paused: number;
  successRate: number;
  avgDurationMs: number | null;
}

/**
 * Per-node analytics data
 */
export interface NodeAnalytics {
  nodeId: string;
  nodeType: string;
  avgDurationMs: number;
  successRate: number;
  totalRuns: number;
  failureCount: number;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * List all executions across workflows with workflow names
 *
 * @param limit - Maximum number of executions to return
 * @param offset - Number of executions to skip
 * @returns Array of executions with workflow names and total count
 */
export async function listAllExecutions(
  limit = 50,
  offset = 0
): Promise<{ executions: ExecutionWithWorkflow[]; total: number }> {
  const db = getDatabase();

  // Get executions with workflow names
  const executions = await db
    .select({
      id: workflowExecutions.id,
      workflowId: workflowExecutions.workflowId,
      status: workflowExecutions.status,
      currentNode: workflowExecutions.currentNode,
      context: workflowExecutions.context,
      conversationHistory: workflowExecutions.conversationHistory,
      nodeStates: workflowExecutions.nodeStates,
      lastError: workflowExecutions.lastError,
      retryCount: workflowExecutions.retryCount,
      startedAt: workflowExecutions.startedAt,
      completedAt: workflowExecutions.completedAt,
      updatedAt: workflowExecutions.updatedAt,
      workflowName: workflows.name,
    })
    .from(workflowExecutions)
    .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
    .orderBy(desc(workflowExecutions.startedAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(workflowExecutions);

  const totalCount = totalResult[0]?.count ?? 0;

  return {
    executions: executions as ExecutionWithWorkflow[],
    total: totalCount,
  };
}

/**
 * Get execution statistics aggregated across all workflows
 *
 * @returns Aggregated execution statistics including counts and success rate
 */
export async function getExecutionStats(): Promise<ExecutionStats> {
  const db = getDatabase();

  // Get status counts
  const statusCounts = await db
    .select({
      status: workflowExecutions.status,
      count: count(),
    })
    .from(workflowExecutions)
    .groupBy(workflowExecutions.status);

  // Convert to object for easy access
  const countsByStatus = statusCounts.reduce(
    (acc, { status, count }) => {
      acc[status] = count;
      return acc;
    },
    {} as Record<string, number>
  );

  const total = statusCounts.reduce((sum, { count }) => sum + count, 0);
  const completed = countsByStatus.completed ?? 0;
  const failed = countsByStatus.failed ?? 0;
  const running = countsByStatus.running ?? 0;
  const pending = countsByStatus.pending ?? 0;
  const paused = countsByStatus.paused ?? 0;

  const successRate = total > 0 ? (completed / total) * 100 : 0;

  // Calculate average duration for completed executions
  const avgResult = await db
    .select({
      avgDuration: sql<number | null>`
        AVG(
          EXTRACT(EPOCH FROM (${workflowExecutions.completedAt} - ${workflowExecutions.startedAt})) * 1000
        )
      `,
    })
    .from(workflowExecutions)
    .where(eq(workflowExecutions.status, 'completed'));

  const avgDuration = avgResult[0]?.avgDuration ?? null;

  return {
    total,
    completed,
    failed,
    running,
    pending,
    paused,
    successRate: Math.round(successRate * 100) / 100,
    avgDurationMs: avgDuration !== null && avgDuration !== undefined && avgDuration !== 0 ? Math.round(avgDuration) : null,
  };
}

/**
 * Get node-level analytics data
 *
 * Analyzes node execution performance across all or specific workflow executions.
 * Calculates average duration, success rate, and failure counts per node.
 *
 * @param workflowId - Optional workflow ID to filter by
 * @returns Array of node analytics with performance metrics
 */
export async function getNodeAnalytics(
  workflowId?: string
): Promise<NodeAnalytics[]> {
  const db = getDatabase();

  // Build where clause
  const whereClause = workflowId !== undefined && workflowId !== null && workflowId !== ''
    ? eq(workflowExecutions.workflowId, workflowId)
    : undefined;

  // Get all executions with node states
  const executions = await db
    .select({
      nodeStates: workflowExecutions.nodeStates,
    })
    .from(workflowExecutions)
    .where(whereClause);

  // Aggregate node statistics
  const nodeStats = new Map<
    string,
    {
      nodeType: string;
      totalRuns: number;
      successCount: number;
      failureCount: number;
      totalDurationMs: number;
    }
  >();

  for (const execution of executions) {
    const nodeStates = execution.nodeStates as Record<
      string,
      {
        nodeId: string;
        status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
        startedAt?: string;
        completedAt?: string;
        result?: unknown;
        error?: string;
      }
    >;

    if (nodeStates === undefined || nodeStates === null) continue;

    for (const [nodeId, state] of Object.entries(nodeStates)) {
      if (state === undefined || state === null || state.startedAt === undefined || state.startedAt === null || state.startedAt === '') continue;

      // Extract node type from node ID (assumes format like "AGENT_1", "COMMAND_2")
      // If this assumption is incorrect, we may need to store node type separately
      const nodeType = nodeId.split('_')[0] ?? 'UNKNOWN';

      const stats = nodeStats.get(nodeId) || {
        nodeType,
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        totalDurationMs: 0,
      };

      stats.totalRuns++;

      if (state.status === 'completed') {
        stats.successCount++;
      } else if (state.status === 'failed') {
        stats.failureCount++;
      }

      // Calculate duration if completed
      if (state.startedAt !== undefined && state.startedAt !== null && state.startedAt !== '' && state.completedAt !== undefined && state.completedAt !== null && state.completedAt !== '') {
        const startMs = new Date(state.startedAt).getTime();
        const endMs = new Date(state.completedAt).getTime();
        stats.totalDurationMs += endMs - startMs;
      }

      nodeStats.set(nodeId, stats);
    }
  }

  // Convert to array and calculate averages
  const analytics: NodeAnalytics[] = [];

  for (const [nodeId, stats] of Array.from(nodeStats.entries())) {
    const avgDurationMs =
      stats.successCount > 0
        ? Math.round(stats.totalDurationMs / stats.successCount)
        : 0;

    const successRate =
      stats.totalRuns > 0
        ? Math.round((stats.successCount / stats.totalRuns) * 10000) / 100
        : 0;

    analytics.push({
      nodeId,
      nodeType: stats.nodeType,
      avgDurationMs,
      successRate,
      totalRuns: stats.totalRuns,
      failureCount: stats.failureCount,
    });
  }

  // Sort by total runs descending
  return analytics.sort((a, b) => b.totalRuns - a.totalRuns);
}
