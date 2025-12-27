/**
 * Workflow Secrets Repository
 *
 * Database operations for encrypted workflow environment variables.
 * All values are encrypted using AES-256-GCM before storage.
 */

import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../client';
import {
  workflowSecrets,
  type WorkflowSecret,
} from '../schema';
import { encrypt, decrypt } from '@/lib/crypto';

// ============================================================================
// Types
// ============================================================================

/**
 * Safe secret representation - excludes encrypted value
 * Used for listing secrets (only shows keys)
 */
export type SafeWorkflowSecret = Omit<WorkflowSecret, 'encryptedValue'>;

/**
 * Secret with decrypted value
 * For internal use only (worker execution)
 */
export type DecryptedWorkflowSecret = Omit<WorkflowSecret, 'encryptedValue'> & {
  value: string;
};

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create or update a workflow secret
 * Encrypts the value before storage
 */
export async function upsert(
  workflowId: string,
  key: string,
  value: string
): Promise<SafeWorkflowSecret> {
  const db = getDatabase();
  const encryptedValue = await encrypt(value);

  // Check if secret already exists
  const existing = await getByKey(workflowId, key);

  if (existing) {
    // Update existing secret
    const [updated] = await db
      .update(workflowSecrets)
      .set({
        encryptedValue,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workflowSecrets.workflowId, workflowId),
          eq(workflowSecrets.key, key)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Failed to update workflow secret');
    }

     
  const { encryptedValue: _encryptedValue, ...safeSecret } = updated;
    return safeSecret;
  }

  // Create new secret
  const [secret] = await db
    .insert(workflowSecrets)
    .values({
      workflowId,
      key,
      encryptedValue,
    })
    .returning();

  if (!secret) {
    throw new Error('Failed to create workflow secret');
  }

   
  const { encryptedValue: _enc, ...safeSecret } = secret;
  return safeSecret;
}

/**
 * Get a secret by workflow ID and key
 * For internal use - includes encrypted value
 */
async function getByKey(
  workflowId: string,
  key: string
): Promise<WorkflowSecret | undefined> {
  const db = getDatabase();
  const [secret] = await db
    .select()
    .from(workflowSecrets)
    .where(
      and(
        eq(workflowSecrets.workflowId, workflowId),
        eq(workflowSecrets.key, key)
      )
    )
    .limit(1);
  return secret;
}

/**
 * List all secret keys for a workflow (without values)
 * Used for displaying in the UI
 */
export async function listByWorkflow(workflowId: string): Promise<SafeWorkflowSecret[]> {
  const db = getDatabase();
  const secrets = await db
    .select()
    .from(workflowSecrets)
    .where(eq(workflowSecrets.workflowId, workflowId));

  // Remove encrypted values from results
  return secrets.map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedValue, ...rest } = s;
    return rest;
  });
}

/**
 * Get all decrypted secrets for a workflow
 * For worker execution only - decrypts all values
 */
export async function getDecryptedSecrets(
  workflowId: string
): Promise<Record<string, string>> {
  const db = getDatabase();
  const secrets = await db
    .select()
    .from(workflowSecrets)
    .where(eq(workflowSecrets.workflowId, workflowId));

  const env: Record<string, string> = {};

  for (const secret of secrets) {
    const value = await decrypt(secret.encryptedValue);
    env[secret.key] = value;
  }

  return env;
}

/**
 * Delete a secret by workflow ID and key
 */
export async function deleteSecret(
  workflowId: string,
  key: string
): Promise<void> {
  const db = getDatabase();
  await db
    .delete(workflowSecrets)
    .where(
      and(
        eq(workflowSecrets.workflowId, workflowId),
        eq(workflowSecrets.key, key)
      )
    );
}

/**
 * Delete all secrets for a workflow
 * Called automatically via CASCADE when workflow is deleted
 */
export async function deleteAllByWorkflow(workflowId: string): Promise<void> {
  const db = getDatabase();
  await db
    .delete(workflowSecrets)
    .where(eq(workflowSecrets.workflowId, workflowId));
}

// ============================================================================
// Re-export types
// ============================================================================

export type { WorkflowSecret };
