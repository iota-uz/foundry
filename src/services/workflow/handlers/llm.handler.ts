/**
 * LLMStep Handler - Executes Claude API calls with structured output
 */

import type { LLMStep, StepResult } from '@/types/workflow/step';
import type { WorkflowContext } from '@/types/workflow/state';
import { getLLMService } from '@/services/ai/llm.service';
import { getPromptService } from '@/services/ai/prompt.service';
import type { LLMCallParams } from '@/types/ai';

/**
 * Execute an LLM step
 */
export async function executeLLMStep(
  step: LLMStep,
  context: WorkflowContext
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    const llmService = getLLMService();
    const promptService = getPromptService(context.projectId);

    // Compile system prompt
    const systemPrompt = await promptService.compilePrompt(
      step.systemPromptFile.replace('.hbs', ''),
      {
        ...context.state.data,
        currentTopic: context.state.data.currentTopic,
        answers: context.state.answers,
        answersSummary: formatAnswersSummary(context.state.answers),
        phase: context.workflowId.replace('-phase', '') as 'cpo' | 'clarify' | 'cto',
        model: step.model,
      }
    );

    // Compile user prompt
    const userPrompt = await promptService.compilePrompt(
      step.userPromptFile.replace('.hbs', ''),
      {
        ...context.state.data,
        currentTopic: context.state.data.currentTopic,
        answers: context.state.answers,
        answersSummary: formatAnswersSummary(context.state.answers),
        phase: context.workflowId.replace('-phase', '') as 'cpo' | 'clarify' | 'cto',
        model: step.model,
      }
    );

    // Prepare LLM call params
    const params: LLMCallParams = {
      model: step.model,
      systemPrompt,
      userPrompt,
      maxTokens: step.maxTokens || 2000,
      ...(step.temperature !== undefined && { temperature: step.temperature }),
      ...(context.constitution && { constitution: context.constitution }),
    };

    // Add output schema if provided
    if (step.outputSchema) {
      params.outputSchema = parseOutputSchema(step.outputSchema);
    }

    // Execute LLM call with retry logic and timeout
    const timeout = step.timeout || 60000; // Default 60 seconds
    const response = await executeWithTimeout(
      executeLLMWithRetry(
        llmService,
        params,
        step.retryable !== false ? 3 : 0
      ),
      timeout
    );

    const duration = Date.now() - startTime;

    return {
      stepId: step.id,
      status: 'completed',
      output: {
        content: response.content,
        structured: response.structured,
      },
      duration,
      tokensUsed: response.tokensUsed,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      stepId: step.id,
      status: 'failed',
      error: error.message || 'LLM step execution failed',
      duration,
    };
  }
}

/**
 * Execute promise with timeout
 */
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM call timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Execute LLM call with exponential backoff retry
 */
async function executeLLMWithRetry(
  llmService: any,
  params: LLMCallParams,
  maxRetries: number,
  attempt: number = 0
): Promise<any> {
  try {
    return await llmService.call(params);
  } catch (error: any) {
    // Check if error is retryable
    if (!isRetryableError(error) || attempt >= maxRetries) {
      throw error;
    }

    // Calculate backoff delay
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Retry
    return executeLLMWithRetry(llmService, params, maxRetries, attempt + 1);
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on rate limits, timeouts, and server errors
  if (error.type === 'rate_limit') return true;
  if (error.type === 'timeout') return true;
  if (error.type === 'api_error' && error.retryable) return true;
  return false;
}

/**
 * Format answers as human-readable summary
 */
function formatAnswersSummary(answers: Record<string, any>): string {
  const entries = Object.entries(answers);
  if (entries.length === 0) {
    return 'No previous answers yet.';
  }

  const lines: string[] = [];
  for (const [questionId, answer] of entries) {
    if (typeof answer === 'object' && answer !== null) {
      lines.push(`${questionId}: ${JSON.stringify(answer)}`);
    } else {
      lines.push(`${questionId}: ${answer}`);
    }
  }

  return lines.join('\n');
}

/**
 * Parse output schema string to Zod schema
 */
function parseOutputSchema(schemaString: string): any {
  // TODO: Implement proper JSON schema to Zod conversion
  // For now, return a generic schema
  try {
    const schema = JSON.parse(schemaString);
    return schema;
  } catch {
    // If not valid JSON, assume it's a Zod schema reference
    return null;
  }
}

/**
 * Validate structured output against schema
 */
export function validateStructuredOutput(
  output: any,
  _schema: any
): { valid: boolean; errors?: string[] } {
  // TODO: Implement proper Zod validation
  // For now, just check if output exists
  if (!output) {
    return {
      valid: false,
      errors: ['Output is empty'],
    };
  }

  return {
    valid: true,
  };
}
