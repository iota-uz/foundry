/**
 * QuestionStep Handler - Presents questions to user and waits for answers
 */

import type { QuestionStep, StepResult } from '@/types/workflow/step';
import type { WorkflowContext } from '@/types/workflow/state';
import type { AIQuestion } from '@/types/ai';
import { EventEmitter } from 'events';

/**
 * Question response from user
 */
export interface QuestionResponse {
  questionId: string;
  answer: any;
  skipped: boolean;
  answeredAt: string;
}

/**
 * Question handler events
 */
export const questionEvents = new EventEmitter();

/**
 * Pending question responses (sessionId -> response)
 */
const pendingResponses = new Map<string, Promise<QuestionResponse>>();

/**
 * Execute a question step
 */
export async function executeQuestionStep(
  step: QuestionStep,
  context: WorkflowContext
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    // Generate or use static question
    const question = await prepareQuestion(step, context);

    // Emit question event for UI
    emitQuestionEvent(context.sessionId, question);

    // Wait for user response
    const response = await waitForResponse(context.sessionId, step.timeout);

    // Validate response
    if (!response.skipped && question.validation) {
      const validationResult = validateAnswer(response.answer, question.validation);
      if (!validationResult.valid) {
        throw new Error(`Invalid answer: ${validationResult.errors?.join(', ')}`);
      }
    }

    // Store answer in workflow state
    const output = {
      questionId: question.id,
      question: question.question,
      answer: response.answer,
      skipped: response.skipped,
      answeredAt: response.answeredAt,
    };

    const duration = Date.now() - startTime;

    return {
      stepId: step.id,
      status: response.skipped ? 'skipped' : 'completed',
      output,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      stepId: step.id,
      status: 'failed',
      error: error.message || 'Question step execution failed',
      duration,
    };
  }
}

/**
 * Prepare question (static or AI-generated)
 */
async function prepareQuestion(
  step: QuestionStep,
  _context: WorkflowContext
): Promise<AIQuestion> {
  if (step.questionSource === 'static' && step.questionData) {
    // Use static question
    return {
      ...step.questionData,
      id: `${step.id}_q${Date.now()}`,
    };
  }

  if (step.questionSource === 'generated' && step.generatorPromptFile) {
    // Generate question via LLM
    // This would call the LLM handler internally
    // For now, return a placeholder
    return {
      id: `${step.id}_q${Date.now()}`,
      question: 'Generated question placeholder',
      questionType: 'text',
      required: true,
    };
  }

  throw new Error('Invalid question step configuration');
}

/**
 * Emit question event to UI via SSE
 */
function emitQuestionEvent(sessionId: string, question: AIQuestion): void {
  questionEvents.emit('question', {
    sessionId,
    question,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Wait for user response
 */
async function waitForResponse(
  sessionId: string,
  timeout: number = 600000 // 10 minutes default
): Promise<QuestionResponse> {
  // Create promise that will be resolved when answer is submitted
  const responsePromise = new Promise<QuestionResponse>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingResponses.delete(sessionId);
      reject(new Error('Question timeout - no response received'));
    }, timeout);

    // Store resolver for this session
    const handler = (response: QuestionResponse) => {
      clearTimeout(timeoutId);
      pendingResponses.delete(sessionId);
      resolve(response);
    };

    questionEvents.once(`answer:${sessionId}`, handler);
  });

  pendingResponses.set(sessionId, responsePromise);
  return responsePromise;
}

/**
 * Submit answer from UI
 */
export function submitAnswer(
  sessionId: string,
  questionId: string,
  answer: any
): void {
  const response: QuestionResponse = {
    questionId,
    answer,
    skipped: false,
    answeredAt: new Date().toISOString(),
  };

  questionEvents.emit(`answer:${sessionId}`, response);
}

/**
 * Skip question from UI
 */
export function skipQuestion(sessionId: string, questionId: string): void {
  const response: QuestionResponse = {
    questionId,
    answer: null,
    skipped: true,
    answeredAt: new Date().toISOString(),
  };

  questionEvents.emit(`answer:${sessionId}`, response);
}

/**
 * Validate answer against validation rules
 */
function validateAnswer(
  answer: any,
  validation: any
): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Required check
  if (validation.required && (answer === null || answer === undefined || answer === '')) {
    errors.push('Answer is required');
  }

  // Text validation
  if (typeof answer === 'string') {
    if (validation.minLength && answer.length < validation.minLength) {
      errors.push(`Minimum length is ${validation.minLength}`);
    }
    if (validation.maxLength && answer.length > validation.maxLength) {
      errors.push(`Maximum length is ${validation.maxLength}`);
    }
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(answer)) {
        errors.push(validation.message || 'Answer does not match required pattern');
      }
    }
  }

  // Number validation
  if (typeof answer === 'number') {
    if (validation.min !== undefined && answer < validation.min) {
      errors.push(`Minimum value is ${validation.min}`);
    }
    if (validation.max !== undefined && answer > validation.max) {
      errors.push(`Maximum value is ${validation.max}`);
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Cancel all pending questions for a session
 */
export function cancelPendingQuestions(sessionId: string): void {
  const pending = pendingResponses.get(sessionId);
  if (pending) {
    questionEvents.emit(`answer:${sessionId}`, {
      questionId: sessionId,
      answer: null,
      skipped: true,
      answeredAt: new Date().toISOString(),
    });
    pendingResponses.delete(sessionId);
  }
}
