/**
 * NestedWorkflowStep Handler - Execute sub-workflows
 */

import type { NestedWorkflowStep, StepResult } from '@/types/workflow/step';
import type { WorkflowContext } from '@/types/workflow/state';
import type { WorkflowResult } from '@/types/workflow/workflow';

/**
 * Execute a nested workflow step
 */
export async function executeNestedWorkflowStep(
  step: NestedWorkflowStep,
  context: WorkflowContext,
  executeWorkflow: (
    workflowId: string,
    sessionId: string,
    context: WorkflowContext
  ) => Promise<WorkflowResult>
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    // Create child session ID
    const childSessionId = `${context.sessionId}_${step.id}_${Date.now()}`;

    // Prepare child context with input mapping
    const childContext: WorkflowContext = {
      ...context,
      sessionId: childSessionId,
      workflowId: step.workflowId as string, // Cast to WorkflowId
      state: {
        ...context.state,
        sessionId: childSessionId,
        workflowId: step.workflowId as string,
        data: {
          ...context.state.data,
          ...step.input,
        },
        currentStepId: '',
        stepHistory: [],
        checkpoint: '',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      },
    };

    // Execute child workflow
    const childResult = await executeWorkflow(
      step.workflowId,
      childSessionId,
      childContext
    );

    // Check result status
    if (childResult.status === 'failed') {
      throw new Error(`Nested workflow failed: ${childResult.error}`);
    }

    const duration = Date.now() - startTime;

    return {
      stepId: step.id,
      status: 'completed',
      output: {
        workflowId: step.workflowId,
        childSessionId,
        result: childResult,
        data: childResult.data,
      },
      duration,
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    return {
      stepId: step.id,
      status: 'failed',
      error: error.message || 'Nested workflow execution failed',
      duration,
    };
  }
}

/**
 * Map child workflow output to parent context
 */
export function mapChildOutput(
  parentData: Record<string, unknown>,
  childData: Record<string, unknown>,
  outputMapping?: Record<string, string>
): Record<string, unknown> {
  if (!outputMapping) {
    // No mapping, merge all child data
    return {
      ...parentData,
      ...childData,
    };
  }

  // Apply output mapping
  const mapped = { ...parentData };
  for (const [childKey, parentKey] of Object.entries(outputMapping)) {
    if (childData[childKey] !== undefined) {
      mapped[parentKey] = childData[childKey];
    }
  }

  return mapped;
}
