/**
 * Automation Engine
 *
 * Handles workflow triggers when issues change status.
 * Features:
 * - Find matching automations for status changes
 * - Execute workflows via existing workflow runner
 * - Apply conditional status transitions
 * - Loop prevention (max 5 chained transitions)
 */

import {
  findAutomationsByTrigger,
  getTransitions,
  getAutomation,
  type ProjectAutomation,
  type ProjectStatusTransition,
} from '@/lib/db/repositories/automation.repository';
import {
  getIssueMetadata,
  updateCurrentStatus,
  createExecution as createIssueExecution,
  updateExecution as updateIssueExecution,
  completeExecution,
  type ExecutionResult,
} from '@/lib/db/repositories/issue-metadata.repository';
import {
  getWorkflow,
  createExecution as createWorkflowExecution,
  getExecution as getWorkflowExecution,
} from '@/lib/db/repositories/workflow.repository';
import { getProject } from '@/lib/db/repositories/project.repository';
import { runWorkflow } from '@/lib/workflow-builder/workflow-runner';
import { WorkflowStatus } from '@/lib/graph';
import { createProjectsClient } from '@/lib/github-projects/client';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';

const MAX_TRANSITION_DEPTH = 5;

/**
 * Internal logger for automation engine
 */
const logger = {
  info: (message: string, ...args: unknown[]) => console.log(`[AutoEngine]`, message, ...args),
  error: (message: string, ...args: unknown[]) => console.error(`[AutoEngine]`, message, ...args),
  warn: (message: string, ...args: unknown[]) => console.warn(`[AutoEngine]`, message, ...args),
};

/**
 * Safely evaluate a custom expression
 *
 * Supports simple comparisons on the execution result:
 * - result === "success"
 * - result === "failure"
 * - context.key === "value"
 * - context.key !== "value"
 * - context.numericKey > 10
 * - context.numericKey < 20
 *
 * This is a SAFE subset - no arbitrary JavaScript execution.
 * Uses a simple parser for security.
 */
function evaluateCustomExpression(
  expression: string,
  context: { result: ExecutionResult; context: Record<string, unknown> }
): boolean {
  try {
    // Remove whitespace
    const expr = expression.trim();

    // Simple expression parser for comparisons
    // Supports: result === "value", context.key === "value", context.key > number, etc.

    // Match patterns like: result === "success"
    const resultMatch = expr.match(/^result\s*(===|!==)\s*"([^"]+)"$/);
    if (resultMatch) {
      const operator = resultMatch[1];
      const value = resultMatch[2];
      if (operator === '===') {
        return context.result === value;
      } else if (operator === '!==') {
        return context.result !== value;
      }
    }

    // Match patterns like: context.key === "value"
    const stringMatch = expr.match(/^context\.([a-zA-Z_][a-zA-Z0-9_]*)\s*(===|!==)\s*"([^"]+)"$/);
    if (stringMatch && stringMatch[1] && stringMatch[2] && stringMatch[3]) {
      const key = stringMatch[1];
      const operator = stringMatch[2];
      const value = stringMatch[3];
      const actualValue = context.context[key];
      if (operator === '===') {
        return actualValue === value;
      } else if (operator === '!==') {
        return actualValue !== value;
      }
    }

    // Match patterns like: context.key > 10, context.key < 20
    const numericMatch = expr.match(/^context\.([a-zA-Z_][a-zA-Z0-9_]*)\s*(>|<|>=|<=)\s*(-?[0-9]+(?:\.[0-9]+)?)$/);
    if (numericMatch && numericMatch[1] && numericMatch[2] && numericMatch[3]) {
      const key = numericMatch[1];
      const operator = numericMatch[2];
      const value = parseFloat(numericMatch[3]);
      const actualValue = context.context[key];

      if (typeof actualValue !== 'number') {
        return false;
      }

      switch (operator) {
        case '>':
          return actualValue > value;
        case '<':
          return actualValue < value;
        case '>=':
          return actualValue >= value;
        case '<=':
          return actualValue <= value;
        default:
          return false;
      }
    }

    logger.warn(`Unsupported expression format: ${expression}`);
    return false;
  } catch (error) {
    logger.error('Error evaluating custom expression:', error);
    return false;
  }
}

/**
 * Evaluate transition condition based on execution result
 */
function evaluateTransition(
  transitions: ProjectStatusTransition[],
  executionResult: ExecutionResult,
  executionContext: Record<string, unknown>
): ProjectStatusTransition | null {
  // Sort by priority (lower number = higher priority)
  const sortedTransitions = [...transitions].sort((a, b) => a.priority - b.priority);

  for (const transition of sortedTransitions) {
    // Handle simple conditions
    if (transition.condition === executionResult) {
      return transition;
    }

    // Handle custom expressions
    if (transition.condition === 'custom' && transition.customExpression) {
      const matches = evaluateCustomExpression(transition.customExpression, {
        result: executionResult,
        context: executionContext,
      });
      if (matches) {
        return transition;
      }
    }
  }

  return null;
}

/**
 * Update GitHub Project status for an issue
 */
async function updateGitHubStatus(
  projectId: string,
  issue: { owner: string; repo: string; issueNumber: number },
  newStatus: string
): Promise<boolean> {
  try {
    // Get project configuration
    const project = await getProject(projectId);
    if (!project) {
      logger.error(`Project ${projectId} not found`);
      return false;
    }

    // Create GitHub Projects client
    const client = createProjectsClient({
      token: project.githubToken,
      projectOwner: project.githubProjectOwner,
      projectNumber: project.githubProjectNumber,
    });

    // Validate project (ensures status field exists)
    await client.validate();

    // Update status
    const result = await client.updateStatus({
      owner: issue.owner,
      repo: issue.repo,
      issueNumber: issue.issueNumber,
      status: newStatus,
    });

    if (!result.success) {
      logger.error(`Failed to update GitHub status: ${result.error}`);
      return false;
    }

    logger.info(`Updated GitHub status to "${newStatus}" for ${issue.owner}/${issue.repo}#${issue.issueNumber}`);
    return true;
  } catch (error) {
    logger.error('Error updating GitHub status:', error);
    return false;
  }
}

/**
 * Execute a single automation for an issue
 */
async function executeAutomation(
  automation: ProjectAutomation,
  issueMetadataId: string,
  triggerStatus: string,
  fromStatus: string | null,
  triggeredBy: 'status_enter' | 'manual'
): Promise<{ result: ExecutionResult; nextStatus: string | null }> {
  logger.info(`Executing automation ${automation.id} for issue ${issueMetadataId}`);

  // Get issue metadata
  const issue = await getIssueMetadata(issueMetadataId);
  if (!issue) {
    logger.error(`Issue metadata ${issueMetadataId} not found`);
    return { result: 'failure', nextStatus: null };
  }

  // Check if workflow exists
  if (!automation.workflowId) {
    logger.error(`Automation ${automation.id} has no workflow assigned`);
    return { result: 'failure', nextStatus: null };
  }

  const workflow = await getWorkflow(automation.workflowId);
  if (!workflow) {
    logger.error(`Workflow ${automation.workflowId} not found`);
    return { result: 'failure', nextStatus: null };
  }

  // Create issue execution record (without workflow execution ID yet)
  const issueExecution = await createIssueExecution({
    issueMetadataId,
    automationId: automation.id,
    triggeredBy,
    triggerStatus,
    fromStatus,
  });

  try {
    // Create workflow execution record
    const workflowExecution = await createWorkflowExecution({
      workflowId: automation.workflowId,
      status: WorkflowStatus.Running,
      currentNode: 'START', // Will be updated by workflow runner
      context: {
        issueMetadataId,
        automationId: automation.id,
        triggerStatus,
        ...(workflow.initialContext as Record<string, unknown>),
      },
    });

    // Update issue execution with workflow execution ID
    await updateIssueExecution(issueExecution.id, {
      workflowExecutionId: workflowExecution.id,
    });

    // Run the workflow
    await runWorkflow({
      executionId: workflowExecution.id,
      workflowId: workflow.id,
      workflowName: workflow.name,
      nodes: workflow.nodes as Node<WorkflowNodeData>[],
      edges: workflow.edges as Edge[],
      initialContext: workflowExecution.context,
    });

    // Get final execution state
    const updatedExecution = await getWorkflowExecution(workflowExecution.id);
    const executionResult: ExecutionResult =
      updatedExecution && updatedExecution.status === WorkflowStatus.Completed
        ? 'success'
        : 'failure';

    // Get transitions for this automation
    const transitions = await getTransitions(automation.id);

    // Evaluate which transition to apply (pass execution context for custom expressions)
    const transition = evaluateTransition(
      transitions,
      executionResult,
      updatedExecution?.context ?? {}
    );

    // If there's a transition, update GitHub Project status
    let appliedStatus: string | null = null;
    if (transition) {
      const updated = await updateGitHubStatus(
        automation.projectId,
        {
          owner: issue.owner,
          repo: issue.repo,
          issueNumber: issue.issueNumber,
        },
        transition.nextStatus
      );

      if (updated) {
        appliedStatus = transition.nextStatus;
        // Update local issue metadata status
        await updateCurrentStatus(issueMetadataId, transition.nextStatus);
      }
    }

    // Complete the issue execution
    await completeExecution(
      issueExecution.id,
      executionResult,
      appliedStatus ?? undefined,
      executionResult === 'failure' ? 'Workflow execution failed' : undefined
    );

    return {
      result: executionResult,
      nextStatus: appliedStatus,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Automation execution failed:`, errorMessage);

    // Complete with failure
    await completeExecution(issueExecution.id, 'failure', undefined, errorMessage);

    return { result: 'failure', nextStatus: null };
  }
}

/**
 * Handle status change for an issue
 *
 * This function:
 * 1. Finds matching automations for the new status
 * 2. Executes workflows in priority order
 * 3. Applies conditional status transitions
 * 4. Prevents infinite loops via depth tracking
 *
 * @param projectId - Project ID
 * @param issueMetadataId - Issue metadata ID
 * @param newStatus - New status that was entered
 * @param depth - Current recursion depth (for loop prevention)
 */
export async function onStatusChange(
  projectId: string,
  issueMetadataId: string,
  newStatus: string,
  depth = 0
): Promise<void> {
  // Prevent infinite loops
  if (depth >= MAX_TRANSITION_DEPTH) {
    logger.warn(
      `Max transition depth (${MAX_TRANSITION_DEPTH}) reached for issue ${issueMetadataId}. Stopping.`
    );
    return;
  }

  logger.info(`Status change detected: project=${projectId}, issue=${issueMetadataId}, status=${newStatus}, depth=${depth}`);

  // Get issue metadata
  const issue = await getIssueMetadata(issueMetadataId);
  if (!issue) {
    logger.error(`Issue metadata ${issueMetadataId} not found`);
    return;
  }

  const fromStatus = issue.currentStatus;

  // Find matching automations
  const automations = await findAutomationsByTrigger(projectId, 'status_enter', newStatus);

  if (automations.length === 0) {
    logger.info(`No automations found for status: ${newStatus}`);
    return;
  }

  logger.info(`Found ${automations.length} automation(s) for status: ${newStatus}`);

  // Execute automations in priority order (already sorted by repository)
  for (const automation of automations) {
    const { nextStatus } = await executeAutomation(
      automation,
      issueMetadataId,
      newStatus,
      fromStatus,
      'status_enter'
    );

    // If there's a next status to transition to, trigger recursively
    if (nextStatus && nextStatus !== newStatus) {
      logger.info(`Transitioning to next status: ${nextStatus}`);

      // Trigger next automation (GitHub status was already updated in executeAutomation)
      await onStatusChange(projectId, issueMetadataId, nextStatus, depth + 1);

      // Only apply the first automation's transition
      break;
    }
  }
}

/**
 * Manually trigger an automation for an issue
 *
 * This is used for manual button triggers in the UI.
 *
 * @param automationId - Automation ID to trigger
 * @param issueMetadataId - Issue metadata ID
 */
export async function triggerManualAutomation(
  automationId: string,
  issueMetadataId: string
): Promise<void> {
  logger.info(`Manual trigger: automation=${automationId}, issue=${issueMetadataId}`);

  // Get automation
  const automation = await getAutomation(automationId);
  if (!automation) {
    throw new Error(`Automation ${automationId} not found`);
  }

  if (automation.triggerType !== 'manual') {
    throw new Error(`Automation ${automationId} is not a manual trigger`);
  }

  if (!automation.enabled) {
    throw new Error(`Automation ${automationId} is disabled`);
  }

  // Get issue metadata
  const issue = await getIssueMetadata(issueMetadataId);
  if (!issue) {
    throw new Error(`Issue metadata ${issueMetadataId} not found`);
  }

  // Execute the automation
  const { nextStatus } = await executeAutomation(
    automation,
    issueMetadataId,
    issue.currentStatus ?? 'Unknown',
    issue.currentStatus,
    'manual'
  );

  // If there's a next status, trigger status change automation
  if (nextStatus && nextStatus !== issue.currentStatus) {
    logger.info(`Manual trigger resulted in status transition to: ${nextStatus}`);

    // Trigger status change automation (GitHub status was already updated in executeAutomation)
    await onStatusChange(automation.projectId, issueMetadataId, nextStatus);
  }
}
