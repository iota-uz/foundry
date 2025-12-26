/**
 * Workflow Secrets validation schemas
 *
 * Zod schemas for workflow environment variable operations.
 */

import { z } from 'zod';

/**
 * Environment variable key pattern
 * Must be uppercase letters, numbers, and underscores
 * Must start with a letter
 */
const envKeyPattern = /^[A-Z][A-Z0-9_]*$/;

/**
 * Schema for setting a workflow secret
 */
export const setWorkflowSecretSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID format'),
  key: z
    .string()
    .min(1, 'Key is required')
    .max(100, 'Key must be 100 characters or less')
    .regex(
      envKeyPattern,
      'Key must be uppercase letters, numbers, and underscores (start with letter)'
    ),
  value: z.string().min(1, 'Value is required').max(10000, 'Value must be 10000 characters or less'),
});

/**
 * Schema for deleting a workflow secret
 */
export const deleteWorkflowSecretSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID format'),
  key: z.string().min(1, 'Key is required'),
});

/**
 * Schema for listing workflow secrets
 */
export const listWorkflowSecretsSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID format'),
});

export type SetWorkflowSecretInput = z.infer<typeof setWorkflowSecretSchema>;
export type DeleteWorkflowSecretInput = z.infer<typeof deleteWorkflowSecretSchema>;
export type ListWorkflowSecretsInput = z.infer<typeof listWorkflowSecretsSchema>;
