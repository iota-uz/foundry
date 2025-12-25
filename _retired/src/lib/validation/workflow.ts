/**
 * Validation schemas for workflow API routes
 */

import { z } from 'zod';

/**
 * Start workflow request validation
 */
export const startWorkflowSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  workflowId: z.enum(['cpo-phase', 'clarify-phase', 'cto-phase', 're-workflow', 'actualize-workflow']),
  mode: z.enum(['new', 'reverse']).optional(),
  initialPrompt: z.string().optional(),
  targetPath: z.string().optional(),
});

/**
 * Pause workflow request validation
 */
export const pauseWorkflowSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * Resume workflow request validation
 */
export const resumeWorkflowSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * Cancel workflow request validation
 */
export const cancelWorkflowSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * Answer request validation
 */
export const answerRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.union([
    z.string(),
    z.array(z.string()),
    z.number(),
    z.boolean(),
    z.record(z.any()),
  ]),
});

/**
 * Skip request validation
 */
export const skipRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
});

/**
 * Retry step request validation
 */
export const retryStepRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  stepId: z.string().min(1, 'Step ID is required'),
});

/**
 * Clarify resolve request validation
 */
export const clarifyResolveSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  ambiguityId: z.string().min(1, 'Ambiguity ID is required'),
  resolution: z.string().min(1, 'Resolution is required'),
});

/**
 * Clarify defer request validation
 */
export const clarifyDeferSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  ambiguityId: z.string().min(1, 'Ambiguity ID is required'),
});

/**
 * Type inference helpers
 */
export type StartWorkflowInput = z.infer<typeof startWorkflowSchema>;
export type PauseWorkflowInput = z.infer<typeof pauseWorkflowSchema>;
export type ResumeWorkflowInput = z.infer<typeof resumeWorkflowSchema>;
export type CancelWorkflowInput = z.infer<typeof cancelWorkflowSchema>;
export type AnswerRequestInput = z.infer<typeof answerRequestSchema>;
export type SkipRequestInput = z.infer<typeof skipRequestSchema>;
export type RetryStepRequestInput = z.infer<typeof retryStepRequestSchema>;
export type ClarifyResolveInput = z.infer<typeof clarifyResolveSchema>;
export type ClarifyDeferInput = z.infer<typeof clarifyDeferSchema>;
