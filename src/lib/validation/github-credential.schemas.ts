/**
 * Zod validation schemas for GitHub Credential API routes
 */

import { z } from 'zod';

/**
 * GitHub Personal Access Token format validation
 * Accepts both classic tokens (ghp_) and fine-grained tokens (github_pat_)
 */
const githubTokenSchema = z
  .string()
  .min(1, 'GitHub token is required')
  .refine(
    (token) => token.startsWith('ghp_') || token.startsWith('github_pat_'),
    'Token must be a valid GitHub Personal Access Token (starts with ghp_ or github_pat_)'
  );

/**
 * Create GitHub credential request schema
 */
export const createGitHubCredentialSchema = z.object({
  name: z
    .string()
    .min(1, 'Credential name is required')
    .max(100, 'Name must be 100 characters or less'),
  token: githubTokenSchema,
});

/**
 * Update GitHub credential request schema (all fields optional)
 */
export const updateGitHubCredentialSchema = z.object({
  name: z
    .string()
    .min(1, 'Credential name cannot be empty')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  token: githubTokenSchema.optional(),
});

/**
 * Type exports
 */
export type CreateGitHubCredentialInput = z.infer<typeof createGitHubCredentialSchema>;
export type UpdateGitHubCredentialInput = z.infer<typeof updateGitHubCredentialSchema>;
