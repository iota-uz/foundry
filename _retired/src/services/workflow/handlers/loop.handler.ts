/**
 * LoopStep Handler - Iterate over collections
 */

import type { LoopStep, StepResult, StepDefinition } from '@/types/workflow/step';
import type { WorkflowContext } from '@/types/workflow/state';

/**
 * Execute a loop step
 */
export async function executeLoopStep(
  step: LoopStep,
  context: WorkflowContext,
  executeStep: (step: StepDefinition, context: WorkflowContext) => Promise<StepResult>
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    // Get collection from context
    const collection = getCollectionFromPath(step.collection, context);

    if (!Array.isArray(collection)) {
      throw new Error(`Collection "${step.collection}" is not an array`);
    }

    // Apply max iterations limit
    const maxIterations = step.maxIterations || 1000;
    const itemCount = Math.min(collection.length, maxIterations);

    // Execute steps for each item
    const results: unknown[] = [];
    let completedIterations = 0;

    for (let i = 0; i < itemCount; i++) {
      const item = collection[i];

      // Create iteration context with loop variable
      const iterationContext: WorkflowContext = {
        ...context,
        state: {
          ...context.state,
          data: {
            ...context.state.data,
            [step.itemVariable]: item,
            loopIndex: i,
            loopTotal: itemCount,
          },
        },
      };

      // Execute loop body steps
      const iterationResults: StepResult[] = [];
      let shouldBreak = false;

      for (const loopStep of step.steps) {
        const result = await executeStep(loopStep, iterationContext);
        iterationResults.push(result);

        // Check for break condition or failure
        if (result.status === 'failed') {
          shouldBreak = true;
          break;
        }

        // Check if step output contains break signal
        if (result.output?.break === true) {
          shouldBreak = true;
          break;
        }
      }

      results.push({
        iteration: i,
        item,
        results: iterationResults,
      });

      completedIterations++;

      if (shouldBreak) {
        break;
      }
    }

    const duration = Date.now() - startTime;

    return {
      stepId: step.id,
      status: 'completed',
      output: {
        totalItems: collection.length,
        completedIterations,
        results,
      },
      duration,
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    return {
      stepId: step.id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Loop step execution failed',
      duration,
    };
  }
}

/**
 * Get collection from dot notation path
 */
function getCollectionFromPath(path: string, context: WorkflowContext): unknown {
  const parts = path.split('.');
  let current: unknown = context.state.data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return [];
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Signal to continue to next iteration (used in loop body)
 */
export const LOOP_CONTINUE = Symbol('LOOP_CONTINUE');

/**
 * Signal to break out of loop (used in loop body)
 */
export const LOOP_BREAK = Symbol('LOOP_BREAK');
