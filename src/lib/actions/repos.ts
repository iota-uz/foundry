'use server';

import { z } from 'zod';
import { actionClient } from './client';
import { addRepoSchema } from '@/lib/validation';
import * as repo from '@/lib/db/repositories/project.repository';

/**
 * Schema for add repo with project id
 */
const addRepoWithProjectIdSchema = z
  .object({
    projectId: z.string().uuid('Invalid project ID format'),
  })
  .merge(addRepoSchema);

/**
 * Add a repository to a project
 */
export const addRepoAction = actionClient
  .schema(addRepoWithProjectIdSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, owner, repo: repoName } = parsedInput;

    // Check if project exists
    const project = await repo.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if repository is already linked
    const alreadyLinked = await repo.isRepoLinked(projectId, owner, repoName);
    if (alreadyLinked) {
      throw new Error('Repository already linked to this project');
    }

    // Add repository
    const projectRepo = await repo.addRepo(projectId, owner, repoName);

    return { repo: projectRepo };
  });

/**
 * Schema for remove repo
 */
const removeRepoSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  repoId: z.string().uuid('Invalid repo ID format'),
});

/**
 * Remove a repository from a project
 */
export const removeRepoAction = actionClient
  .schema(removeRepoSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, repoId } = parsedInput;

    // Check if project exists
    const project = await repo.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    await repo.removeRepo(projectId, repoId);

    return { success: true };
  });
