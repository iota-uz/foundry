/**
 * ConditionalStep Handler - Branch based on conditions
 */

import type { ConditionalStep, StepResult, StepDefinition } from '@/types/workflow/step';
import type { WorkflowContext } from '@/types/workflow/state';

/**
 * Execute a conditional step
 */
export async function executeConditionalStep(
  step: ConditionalStep,
  context: WorkflowContext,
  executeStep: (step: StepDefinition, context: WorkflowContext) => Promise<StepResult>
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    // Evaluate condition
    const conditionResult = evaluateCondition(step.condition, context);

    // Choose branch
    const branch = conditionResult ? step.thenSteps : step.elseSteps || [];

    // Execute branch steps
    const results: unknown[] = [];
    for (const branchStep of branch) {
      const result = await executeStep(branchStep, context);
      results.push(result);

      // If step failed, stop execution
      if (result.status === 'failed') {
        break;
      }
    }

    const duration = Date.now() - startTime;

    return {
      stepId: step.id,
      status: 'completed',
      output: {
        conditionResult,
        branchExecuted: conditionResult ? 'then' : 'else',
        results,
      },
      duration,
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    return {
      stepId: step.id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Conditional step execution failed',
      duration,
    };
  }
}

/**
 * Evaluate condition expression
 */
function evaluateCondition(condition: string, context: WorkflowContext): boolean {
  try {
    // Create evaluation context with workflow data
    const evalContext = {
      state: context.state,
      data: context.state.data,
      answers: context.state.answers,
      ...context.state.data,
    };

    // Safe evaluation using Function constructor
    // Note: In production, use a proper expression parser
    const func = new Function(
      'context',
      `with(context) { return Boolean(${condition}); }`
    );

    return func(evalContext);
  } catch (error) {
    console.error('Condition evaluation error:', error);
    return false;
  }
}

/**
 * Validate condition syntax
 */
export function validateCondition(condition: string): { valid: boolean; error?: string | undefined } {
  try {
    // Basic syntax check
    new Function('context', `with(context) { return Boolean(${condition}); }`);
    return { valid: true };
  } catch (error: unknown) {
    return {
      valid: false,
      error: `Invalid condition syntax: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
