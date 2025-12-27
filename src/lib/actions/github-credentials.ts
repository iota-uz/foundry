'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { actionClient } from './client';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createGitHubCredentialSchema,
  updateGitHubCredentialSchema,
} from '@/lib/validation';
import * as GitHubCredentialRepository from '@/lib/db/repositories/github-credential.repository';
import { getDatabase } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';

/**
 * Safe credential type (excludes token)
 */
export type SafeGitHubCredential = GitHubCredentialRepository.SafeGitHubCredential;

/**
 * Create a new GitHub credential
 */
export const createGitHubCredentialAction = actionClient
  .schema(createGitHubCredentialSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    const credential = await GitHubCredentialRepository.create(
      user.id,
      parsedInput.name,
      parsedInput.token
    );

    return { credential };
  });

/**
 * Schema for update with id
 */
const updateGitHubCredentialWithIdSchema = z
  .object({
    id: z.string().uuid('Invalid credential ID format'),
  })
  .merge(updateGitHubCredentialSchema);

/**
 * Update a GitHub credential (name and/or token)
 */
export const updateGitHubCredentialAction = actionClient
  .schema(updateGitHubCredentialWithIdSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    const { id, name, token } = parsedInput;

    // Check ownership
    const isOwner = await GitHubCredentialRepository.isOwnedByUser(id, user.id);
    if (!isOwner) {
      throw new Error('Credential not found or access denied');
    }

    // Update name if provided
    if (name !== undefined) {
      await GitHubCredentialRepository.update(id, { name });
    }

    // Update token if provided
    if (token !== undefined) {
      await GitHubCredentialRepository.updateToken(id, token);
    }

    // Get updated credential
    const credential = await GitHubCredentialRepository.getById(id);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Return without token
     
    const { encryptedToken: _encryptedToken, ...safeCredential } = credential;
    return { credential: safeCredential };
  });

/**
 * Schema for delete credential
 */
const deleteGitHubCredentialSchema = z.object({
  id: z.string().uuid('Invalid credential ID format'),
});

/**
 * Delete a GitHub credential
 */
export const deleteGitHubCredentialAction = actionClient
  .schema(deleteGitHubCredentialSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    const { id } = parsedInput;

    // Check ownership
    const isOwner = await GitHubCredentialRepository.isOwnedByUser(id, user.id);
    if (!isOwner) {
      throw new Error('Credential not found or access denied');
    }

    // Check if any projects reference this credential
    const db = getDatabase();
    const referencingProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.githubCredentialId, id))
      .limit(1);

    if (referencingProjects.length > 0) {
      throw new Error(
        'Cannot delete credential: it is currently being used by one or more projects'
      );
    }

    await GitHubCredentialRepository.deleteCredential(id);
    return { success: true };
  });

/**
 * List all credentials for the current user (without tokens)
 */
export const listGitHubCredentialsAction = actionClient
  .schema(z.object({}))
  .action(async () => {
    const user = await getCurrentUser();
    const credentials = await GitHubCredentialRepository.listByUser(user.id);
    return { credentials };
  });

/**
 * Schema for get credential by id
 */
const getGitHubCredentialSchema = z.object({
  id: z.string().uuid('Invalid credential ID format'),
});

/**
 * Get a single credential by ID (ownership check)
 */
export const getGitHubCredentialAction = actionClient
  .schema(getGitHubCredentialSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    const { id } = parsedInput;

    // Check ownership
    const isOwner = await GitHubCredentialRepository.isOwnedByUser(id, user.id);
    if (!isOwner) {
      throw new Error('Credential not found or access denied');
    }

    const credential = await GitHubCredentialRepository.getById(id);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Return without token
     
    const { encryptedToken: _encryptedToken, ...safeCredential } = credential;
    return { credential: safeCredential };
  });
