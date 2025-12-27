/**
 * GitHub Credential Repository
 *
 * Database operations for encrypted GitHub Personal Access Tokens.
 * All tokens are encrypted using AES-256-GCM before storage.
 */

import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../client';
import {
  githubCredentials,
  type GitHubCredential,
  type NewGitHubCredential,
} from '../schema';
import { encrypt, decrypt } from '@/lib/crypto';

// ============================================================================
// Types
// ============================================================================

/**
 * Safe credential representation - excludes encrypted token
 */
export type SafeGitHubCredential = Omit<GitHubCredential, 'encryptedToken'>;

/**
 * Credential with decrypted token
 */
export type DecryptedGitHubCredential = Omit<GitHubCredential, 'encryptedToken'> & {
  token: string;
};

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new GitHub credential
 * Encrypts the token before storage
 */
export async function create(
  userId: string,
  name: string,
  token: string
): Promise<SafeGitHubCredential> {
  const db = getDatabase();
  const encryptedToken = await encrypt(token);

  const [credential] = await db
    .insert(githubCredentials)
    .values({
      userId,
      name,
      encryptedToken,
    })
    .returning();

  if (!credential) {
    throw new Error('Failed to create GitHub credential');
  }

  // Return without encrypted token
   
  const { encryptedToken: _encryptedToken, ...safeCredential } = credential;
  return safeCredential;
}

/**
 * Get a credential by ID (encrypted token included)
 * For internal use only - use getWithDecryptedToken for actual token retrieval
 */
export async function getById(id: string): Promise<GitHubCredential | undefined> {
  const db = getDatabase();
  const [credential] = await db
    .select()
    .from(githubCredentials)
    .where(eq(githubCredentials.id, id))
    .limit(1);
  return credential;
}

/**
 * Get a credential with decrypted token
 */
export async function getWithDecryptedToken(
  id: string
): Promise<DecryptedGitHubCredential | undefined> {
  const credential = await getById(id);
  if (!credential) {
    return undefined;
  }

  const token = await decrypt(credential.encryptedToken);
   
  const { encryptedToken: _encryptedToken, ...rest } = credential;

  return {
    ...rest,
    token,
  };
}

/**
 * List all credentials for a user (without tokens)
 */
export async function listByUser(userId: string): Promise<SafeGitHubCredential[]> {
  const db = getDatabase();
  const credentials = await db
    .select()
    .from(githubCredentials)
    .where(eq(githubCredentials.userId, userId));

  // Remove encrypted tokens from results
   
  return credentials.map(({ encryptedToken: _encryptedToken, ...rest }) => rest);
}

/**
 * Update a credential's name
 */
export async function update(
  id: string,
  data: { name?: string }
): Promise<SafeGitHubCredential> {
  const db = getDatabase();
  const [credential] = await db
    .update(githubCredentials)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(githubCredentials.id, id))
    .returning();

  if (!credential) {
    throw new Error('GitHub credential not found');
  }

   
  const { encryptedToken: _encryptedToken, ...safeCredential } = credential;
  return safeCredential;
}

/**
 * Update a credential's token
 * Encrypts the new token before storage
 */
export async function updateToken(
  id: string,
  token: string
): Promise<SafeGitHubCredential> {
  const db = getDatabase();
  const encryptedToken = await encrypt(token);

  const [credential] = await db
    .update(githubCredentials)
    .set({ encryptedToken, updatedAt: new Date() })
    .where(eq(githubCredentials.id, id))
    .returning();

  if (!credential) {
    throw new Error('GitHub credential not found');
  }

   
  const { encryptedToken: _encryptedToken, ...safeCredential } = credential;
  return safeCredential;
}

/**
 * Delete a credential
 */
export async function deleteCredential(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(githubCredentials).where(eq(githubCredentials.id, id));
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a credential is owned by a user
 */
export async function isOwnedByUser(id: string, userId: string): Promise<boolean> {
  const db = getDatabase();
  const [credential] = await db
    .select()
    .from(githubCredentials)
    .where(and(eq(githubCredentials.id, id), eq(githubCredentials.userId, userId)))
    .limit(1);
  return !!credential;
}

// ============================================================================
// Re-export types
// ============================================================================

export type { GitHubCredential, NewGitHubCredential };
