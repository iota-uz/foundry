/**
 * Token Resolution Helper
 *
 * Resolves GitHub tokens from projects using the new credential system
 * with fallback to legacy direct token storage.
 */

import { getWithDecryptedToken } from '@/lib/db/repositories/github-credential.repository';
import type { Project } from '@/lib/db/schema';

/**
 * Resolve the actual GitHub token from a project
 *
 * Resolution order:
 * 1. If project.githubCredentialId exists, fetch and decrypt from credentials table
 * 2. Fallback to project.githubToken (legacy direct storage)
 * 3. Throw error if neither is available
 *
 * @param project - The project to resolve the token for
 * @returns The decrypted GitHub PAT
 * @throws Error if no token is available
 */
export async function resolveProjectToken(project: Project): Promise<string> {
  // New approach: credential reference
  if (project.githubCredentialId) {
    const credential = await getWithDecryptedToken(project.githubCredentialId);

    if (!credential) {
      throw new Error(
        `GitHub credential not found for project "${project.name}" (credential ID: ${project.githubCredentialId})`
      );
    }

    return credential.token;
  }

  // Legacy approach: direct token storage
  if (project.githubToken) {
    return project.githubToken;
  }

  // No token available
  throw new Error(
    `No GitHub token configured for project "${project.name}". ` +
    `Please configure a GitHub credential or token.`
  );
}
