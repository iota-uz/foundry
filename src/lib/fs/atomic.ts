/**
 * Atomic file write operations
 * Ensures file writes are atomic to prevent corruption
 */

import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

/**
 * Write file atomically using temp file + rename
 * This prevents corruption if the process crashes during write
 */
export async function atomicWrite(
  filePath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  const tmpName = `.${basename}.${randomBytes(6).toString('hex')}.tmp`;
  const tmpPath = path.join(dir, tmpName);

  try {
    // Write to temp file
    await fs.writeFile(tmpPath, content, 'utf-8');

    // Rename to target (atomic operation on most filesystems)
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tmpPath);
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(
      `Atomic write failed for ${filePath}: ${(error as Error).message}`
    );
  }
}

/**
 * Write file with backup
 * Creates a backup of the existing file before writing
 */
export async function writeWithBackup(
  filePath: string,
  content: string
): Promise<void> {
  try {
    // Check if file exists
    await fs.access(filePath);

    // Create backup
    const backupPath = `${filePath}.backup`;
    await fs.copyFile(filePath, backupPath);

    try {
      // Write new content atomically
      await atomicWrite(filePath, content);

      // Remove backup on success
      await fs.unlink(backupPath);
    } catch (error) {
      // Restore from backup on failure
      await fs.copyFile(backupPath, filePath);
      await fs.unlink(backupPath);
      throw error;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, just write normally
      await atomicWrite(filePath, content);
    } else {
      throw error;
    }
  }
}
