/**
 * Zod validation schemas for Project API routes
 */

import { z } from 'zod';

/**
 * Create project request schema
 */
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  githubToken: z.string().min(1, 'GitHub token is required'),
  githubProjectOwner: z.string().min(1, 'GitHub project owner is required'),
  githubProjectNumber: z.number().int().positive('Project number must be positive'),
  syncIntervalMinutes: z.number().int().positive('Sync interval must be positive').default(5),
});

/**
 * Update project request schema (all fields optional)
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name cannot be empty').max(255, 'Name too long').optional(),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  githubToken: z.string().min(1, 'GitHub token cannot be empty').optional(),
  githubProjectOwner: z.string().min(1, 'GitHub project owner cannot be empty').optional(),
  githubProjectNumber: z.number().int().positive('Project number must be positive').optional(),
  syncIntervalMinutes: z.number().int().positive('Sync interval must be positive').optional(),
});

/**
 * Add repository request schema
 */
export const addRepoSchema = z.object({
  owner: z.string().min(1, 'Repository owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
});

/**
 * UUID parameter schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Type exports
 */
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddRepoInput = z.infer<typeof addRepoSchema>;
