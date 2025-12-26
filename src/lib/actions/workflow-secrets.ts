'use server';

import { actionClient } from './client';
import {
  setWorkflowSecretSchema,
  deleteWorkflowSecretSchema,
  listWorkflowSecretsSchema,
} from '@/lib/validation';
import * as WorkflowSecretsRepository from '@/lib/db/repositories/workflow-secrets.repository';

/**
 * Safe secret type (excludes encrypted value)
 */
export type SafeWorkflowSecret = WorkflowSecretsRepository.SafeWorkflowSecret;

/**
 * Set (create or update) a workflow secret
 * Encrypts the value before storage
 */
export const setWorkflowSecretAction = actionClient
  .schema(setWorkflowSecretSchema)
  .action(async ({ parsedInput }) => {
    const { workflowId, key, value } = parsedInput;

    const secret = await WorkflowSecretsRepository.upsert(workflowId, key, value);

    return { secret };
  });

/**
 * Delete a workflow secret
 */
export const deleteWorkflowSecretAction = actionClient
  .schema(deleteWorkflowSecretSchema)
  .action(async ({ parsedInput }) => {
    const { workflowId, key } = parsedInput;

    await WorkflowSecretsRepository.deleteSecret(workflowId, key);

    return { success: true };
  });

/**
 * List all secrets for a workflow (without values)
 * Only returns the keys, never the decrypted values
 */
export const listWorkflowSecretsAction = actionClient
  .schema(listWorkflowSecretsSchema)
  .action(async ({ parsedInput }) => {
    const { workflowId } = parsedInput;

    const secrets = await WorkflowSecretsRepository.listByWorkflow(workflowId);

    return { secrets };
  });
