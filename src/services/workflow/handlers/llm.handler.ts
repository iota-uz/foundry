/**
 * LLMStep Handler - Executes Claude API calls with structured output
 */

import type { LLMStep, StepResult } from '@/types/workflow/step';
import type { Decision } from '@/lib/db/queries/decisions';
import type { WorkflowContext } from '@/types/workflow/state';
import { getLLMService } from '@/services/ai/llm.service';
import { getPromptService } from '@/services/ai/prompt.service';
import { getDatabaseService } from '@/services/core/database.service';
import type { LLMCallParams } from '@/types/ai';
import { nanoid } from 'nanoid';

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
  } catch (error: unknown) {
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
  llmService: unknown,
  params: LLMCallParams,
  maxRetries: number,
  attempt: number = 0
): Promise<unknown> {
  try {
    return await llmService.call(params);
  } catch (error: unknown) {
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
function isRetryableError(error: unknown): boolean {
  // Retry on rate limits, timeouts, and server errors
  if (error.type === 'rate_limit') return true;
  if (error.type === 'timeout') return true;
  if (error.type === 'api_error' && error.retryable) return true;
  return false;
}

/**
 * Format answers as human-readable summary
 */
function formatAnswersSummary(answers: Record<string, unknown>): string {
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
function parseOutputSchema(schemaString: string): unknown {
  // Happy path: Parse JSON schema and return for Claude API
  // Claude API supports JSON schema natively, no need to convert to Zod
  try {
    const schema = JSON.parse(schemaString);

    // Basic validation of JSON schema structure
    if (!schema.type && !schema.properties && !schema.$ref) {
      console.warn('Invalid JSON schema structure, missing type/properties/$ref');
      return null;
    }

    return schema;
  } catch (error) {
    console.warn('Failed to parse output schema:', error);
    return null;
  }
}

/**
 * Validate structured output against schema
 */
export function validateStructuredOutput(
  output: unknown,
  schema: unknown
): { valid: boolean; errors?: string[] } {
  // Happy path validation: basic type checking
  if (!output) {
    return {
      valid: false,
      errors: ['Output is empty'],
    };
  }

  // If no schema provided, just check output exists
  if (!schema) {
    return { valid: true };
  }

  const errors: string[] = [];

  try {
    // Basic schema validation
    if (schema.type === 'object' && typeof output !== 'object') {
      errors.push(`Expected object, got ${typeof output}`);
    }

    if (schema.type === 'array' && !Array.isArray(output)) {
      errors.push(`Expected array, got ${typeof output}`);
    }

    if (schema.type === 'string' && typeof output !== 'string') {
      errors.push(`Expected string, got ${typeof output}`);
    }

    if (schema.type === 'number' && typeof output !== 'number') {
      errors.push(`Expected number, got ${typeof output}`);
    }

    if (schema.type === 'boolean' && typeof output !== 'boolean') {
      errors.push(`Expected boolean, got ${typeof output}`);
    }

    // Check required properties for objects
    if (schema.type === 'object' && schema.required && Array.isArray(schema.required)) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in output)) {
          errors.push(`Missing required property: ${requiredProp}`);
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${(error as Error).message}`],
    };
  }
}

/**
 * Log decision to database (F17 - Decision Journal)
 */
export async function logDecision(
  context: WorkflowContext,
  questionId: string,
  questionText: string,
  answer: unknown,
  recommendation?: unknown
): Promise<void> {
  try {
    const dbService = getDatabaseService();

    // Determine category from question text
    const category = categorizeQuestion(questionText);// Build decision entry
    const decision: Decision = {
      id: nanoid(),
      projectId: context.projectId,
      featureId: null,
      sessionId: context.sessionId,
      questionId,
      questionText,
      answerGiven: answer,
      alternatives: null,
      category,
      phase: (context.workflowId.replace('-phase', '') as 'cpo' | 'clarify' | 'cto'),
      batchId: null,
      artifactsAffected: null,
      specChanges: null,
      cascadeGroup: null,
      canUndo: true,
      undoneAt: null,
      undoneBy: null,
      aiRecommendation: recommendation ? JSON.stringify({
        optionId: recommendation.recommendedOptionId,
        confidence: recommendation.confidence || 'medium',
        reasoning: recommendation.reasoning || '',
      }) : null,
      recommendationFollowed: recommendation ? (answer === recommendation.recommendedOptionId) : null,
      rationaleExplicit: null,
      rationaleInferred: null,
      rationaleConfidence: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Record to database
    await dbService.recordDecision(decision);
  } catch (error) {
    // Don't fail the workflow if logging fails
    console.warn('Failed to log decision:', error);
  }
}

/**
 * Categorize question for decision journal
 */
function categorizeQuestion(questionText: string): string {
  const text = questionText.toLowerCase();

  if (text.includes('feature') || text.includes('capability')) {
    return 'product_scope';
  }
  if (text.includes('user') || text.includes('interface') || text.includes('ui')) {
    return 'user_experience';
  }
  if (text.includes('database') || text.includes('schema') || text.includes('entity')) {
    return 'data_model';
  }
  if (text.includes('api') || text.includes('endpoint') || text.includes('rest') || text.includes('graphql')) {
    return 'api_design';
  }
  if (text.includes('technology') || text.includes('stack') || text.includes('framework')) {
    return 'technology';
  }
  if (text.includes('security') || text.includes('authentication') || text.includes('authorization')) {
    return 'security';
  }
  if (text.includes('performance') || text.includes('speed') || text.includes('cache')) {
    return 'performance';
  }
  if (text.includes('integration') || text.includes('third-party') || text.includes('external')) {
    return 'integration';
  }

  return 'general';
}

/**
 * Calculate reversibility of a decision
 */
