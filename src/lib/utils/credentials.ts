/**
 * Credentials management utilities
 * Store/load API keys from ~/.foundry/credentials
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { atomicWrite } from '@/lib/fs/atomic';

const FOUNDRY_HOME = path.join(os.homedir(), '.foundry');
const CREDENTIALS_FILE = path.join(FOUNDRY_HOME, 'credentials');

interface Credentials {
  anthropic_api_key?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Ensure ~/.foundry directory exists
 */
async function ensureFoundryHome(): Promise<void> {
  try {
    await fs.mkdir(FOUNDRY_HOME, { recursive: true, mode: 0o700 });
  } catch (error) {
    // Directory might already exist, that's fine
  }
}

/**
 * Load credentials from file
 */
export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const content = await fs.readFile(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to load credentials: ${(error as Error).message}`);
  }
}

/**
 * Save credentials to file
 */
export async function saveCredentials(credentials: Credentials): Promise<void> {
  try {
    await ensureFoundryHome();

    const now = new Date().toISOString();
    const fullCredentials: Credentials = {
      ...credentials,
      updated_at: now,
      created_at: credentials.created_at || now,
    };

    const content = JSON.stringify(fullCredentials, null, 2);
    await atomicWrite(CREDENTIALS_FILE, content);

    // Set secure file permissions (read/write for owner only)
    await fs.chmod(CREDENTIALS_FILE, 0o600);
  } catch (error) {
    throw new Error(`Failed to save credentials: ${(error as Error).message}`);
  }
}

/**
 * Get API key from credentials file
 */
export async function getApiKeyFromCredentials(): Promise<string | null> {
  const credentials = await loadCredentials();
  return credentials?.anthropic_api_key || null;
}

/**
 * Save API key to credentials file
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  const existing = await loadCredentials();
  await saveCredentials({
    ...existing,
    anthropic_api_key: apiKey,
  });
}

/**
 * Delete API key from credentials file
 */
export async function deleteApiKey(): Promise<void> {
  const existing = await loadCredentials();
  if (existing) {
    delete existing.anthropic_api_key;
    await saveCredentials(existing);
  }
}

/**
 * Check if credentials file exists
 */
export async function credentialsExist(): Promise<boolean> {
  try {
    await fs.access(CREDENTIALS_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get API key from environment or credentials (in that order)
 */
export async function getApiKey(): Promise<string | null> {
  // First check environment
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Then check credentials file
  return await getApiKeyFromCredentials();
}
