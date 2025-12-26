'use server';

import { z } from 'zod';
import { actionClient } from './client';
import { createProjectSchema, updateProjectSchema } from '@/lib/validation';
import * as repo from '@/lib/db/repositories/project.repository';
import { createSyncEngine } from '@/lib/projects';

/**
 * Safe project type (excludes sensitive data like githubToken)
 */
interface SafeProject {
  id: string;
  name: string;
  description: string | null;
  githubProjectOwner: string;
  githubProjectNumber: number;
  syncIntervalMinutes: number | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a safe project response (excludes githubToken)
 */
function toSafeProject(project: repo.Project): SafeProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    githubProjectOwner: project.githubProjectOwner,
    githubProjectNumber: project.githubProjectNumber,
    syncIntervalMinutes: project.syncIntervalMinutes,
    lastSyncedAt: project.lastSyncedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * Create a new project with GitHub validation
 */
export const createProjectAction = actionClient
  .schema(createProjectSchema)
  .action(async ({ parsedInput }) => {
    // Validate GitHub connection before creating project
    const syncEngine = createSyncEngine();
    const validation = await syncEngine.validateProject({
      id: '', // Not needed for validation
      githubToken: parsedInput.githubToken,
      githubProjectOwner: parsedInput.githubProjectOwner,
      githubProjectNumber: parsedInput.githubProjectNumber,
      name: parsedInput.name,
      description: parsedInput.description ?? null,
      syncIntervalMinutes: parsedInput.syncIntervalMinutes ?? 5,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!validation.valid) {
      throw new Error(`GitHub project validation failed: ${validation.errors.join(', ')}`);
    }

    // Create project
    const project = await repo.createProject({
      name: parsedInput.name,
      description: parsedInput.description ?? null,
      githubToken: parsedInput.githubToken,
      githubProjectOwner: parsedInput.githubProjectOwner,
      githubProjectNumber: parsedInput.githubProjectNumber,
      syncIntervalMinutes: parsedInput.syncIntervalMinutes ?? 5,
    });

    // Return project without token
    return { project: toSafeProject(project) };
  });

/**
 * Schema for update project with id
 */
const updateProjectWithIdSchema = z
  .object({
    id: z.string().uuid('Invalid project ID format'),
  })
  .merge(updateProjectSchema);

/**
 * Update an existing project
 */
export const updateProjectAction = actionClient
  .schema(updateProjectWithIdSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;

    // Check if project exists
    const existing = await repo.getProject(id);
    if (!existing) {
      throw new Error('Project not found');
    }

    // If GitHub config is being updated, validate it
    if (
      data.githubToken !== undefined ||
      data.githubProjectOwner !== undefined ||
      data.githubProjectNumber !== undefined
    ) {
      const syncEngine = createSyncEngine();
      const validation = await syncEngine.validateProject({
        id,
        githubToken: data.githubToken ?? existing.githubToken,
        githubProjectOwner: data.githubProjectOwner ?? existing.githubProjectOwner,
        githubProjectNumber: data.githubProjectNumber ?? existing.githubProjectNumber,
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        syncIntervalMinutes: data.syncIntervalMinutes ?? existing.syncIntervalMinutes,
        lastSyncedAt: existing.lastSyncedAt,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      });

      if (!validation.valid) {
        throw new Error(`GitHub project validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Build update data - only include defined values
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.githubToken !== undefined) updateData.githubToken = data.githubToken;
    if (data.githubProjectOwner !== undefined) updateData.githubProjectOwner = data.githubProjectOwner;
    if (data.githubProjectNumber !== undefined) updateData.githubProjectNumber = data.githubProjectNumber;
    if (data.syncIntervalMinutes !== undefined) updateData.syncIntervalMinutes = data.syncIntervalMinutes;

    const project = await repo.updateProject(id, updateData);

    // Return project without token
    return { project: toSafeProject(project) };
  });

/**
 * Schema for delete project
 */
const deleteProjectSchema = z.object({
  id: z.string().uuid('Invalid project ID format'),
});

/**
 * Delete a project
 */
export const deleteProjectAction = actionClient
  .schema(deleteProjectSchema)
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    // Check if project exists
    const existing = await repo.getProject(id);
    if (!existing) {
      throw new Error('Project not found');
    }

    await repo.deleteProject(id);
    return { success: true };
  });

/**
 * Schema for sync project
 */
const syncProjectSchema = z.object({
  id: z.string().uuid('Invalid project ID format'),
});

/**
 * Trigger manual sync for a project
 */
export const syncProjectAction = actionClient
  .schema(syncProjectSchema)
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    const project = await repo.getProject(id);
    if (!project) {
      throw new Error('Project not found');
    }

    const syncEngine = createSyncEngine();

    // Validate project first
    const validation = await syncEngine.validateProject(project);
    if (!validation.valid) {
      throw new Error(`GitHub project validation failed: ${validation.errors.join(', ')}`);
    }

    // Perform sync
    const result = await syncEngine.syncProjectItems(id, project);

    return {
      synced: result.synced,
      added: result.added,
      updated: result.updated,
      statusChanges: result.statusChanges,
      errors: result.errors,
    };
  });
