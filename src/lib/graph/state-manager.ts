/**
 * @sys/graph - State Persistence Manager
 *
 * Handles atomic read/write operations for workflow state using Bun's native file I/O.
 * Ensures data integrity during crashes via atomic write patterns.
 */

import type { BaseState } from './types';
import { createLogger } from '@/lib/logging';

/**
 * Configuration for state persistence.
 */
export interface StateManagerConfig {
  /** Directory where state files are stored */
  stateDir: string;
}

/**
 * Manages persistent storage of workflow state with atomic write guarantees.
 *
 * Uses the "write to temp, then rename" pattern to ensure that a crash during
 * a write operation never corrupts the state file. The rename operation is atomic
 * at the filesystem level.
 */
export class StateManager<TState extends BaseState> {
  private stateDir: string;
  private logger = createLogger({ component: 'StateManager' });

  constructor(config: StateManagerConfig) {
    this.stateDir = config.stateDir;
  }

  /**
   * Loads workflow state from disk.
   *
   * @param id - Unique workflow identifier
   * @returns The persisted state, or null if it doesn't exist
   */
  async load(id: string): Promise<TState | null> {
    const filePath = this.getSanitizedStatePath(id);

    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return null;
      }

      const content = await file.text();
      return JSON.parse(content) as TState;
    } catch (error) {
      // If the file is corrupted or unreadable, log and return null
      this.logger.error(`Failed to load state for workflow ${id}`, { error, workflowId: id });
      return null;
    }
  }

  /**
   * Saves workflow state to disk atomically.
   *
   * This uses the atomic write pattern:
   * 1. Write to a temporary file (.tmp)
   * 2. Rename the temp file to the target (atomic operation)
   *
   * If the process crashes during step 1, the temp file is left behind but
   * the original state file remains intact. If it crashes during step 2,
   * the rename is atomic so either the old or new file exists, never corrupted.
   *
   * @param id - Unique workflow identifier
   * @param state - State to persist
   */
  async save(id: string, state: TState): Promise<void> {
    const filePath = this.getSanitizedStatePath(id);
    const tempPath = `${filePath}.tmp`;

    try {
      // Step 1: Write to temporary file
      const content = JSON.stringify(state, null, 2);
      await Bun.write(tempPath, content);

      // Step 2: Atomic rename
      // Note: Bun doesn't have a built-in rename, so we use Node's fs
      const fs = await import('fs/promises');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        const fs = await import('fs/promises');
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Log cleanup errors at debug level for troubleshooting
        this.logger.debug(`Failed to clean up temp state file "${tempPath}"`, { cleanupError });
      }

      const errorMessage = `Failed to save state for workflow ${id}: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { error, workflowId: id });
      throw new Error(errorMessage);
    }
  }

  /**
   * Deletes workflow state from disk.
   *
   * @param id - Unique workflow identifier
   */
  async delete(id: string): Promise<void> {
    const filePath = this.getSanitizedStatePath(id);

    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error: unknown) {
      // Ignore if file doesn't exist
      if (error !== null && error !== undefined && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
        const errorMessage = `Failed to delete state for workflow ${id}: ${error instanceof Error ? error.message : String(error)}`;
        this.logger.error(errorMessage, { error, workflowId: id });
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Lists all workflow IDs in the state directory.
   *
   * @returns Array of workflow IDs
   */
  async list(): Promise<string[]> {
    try {
      const fs = await import('fs/promises');

      // Ensure directory exists
      try {
        await fs.access(this.stateDir);
      } catch {
        return [];
      }

      const files = await fs.readdir(this.stateDir);
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace('.json', ''));
    } catch (error) {
      this.logger.error('Failed to list workflows', { error });
      return [];
    }
  }

  /**
   * Ensures the state directory exists.
   * Should be called before first use.
   */
  async ensureStateDir(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.mkdir(this.stateDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create state directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets the full file path for a workflow's state file.
   *
   * SECURITY: This method sanitizes the ID to prevent path traversal attacks
   * by replacing non-alphanumeric characters with underscores.
   *
   * NOTE: This sanitization could lead to ID collisions. For example, both
   * "workflow@1" and "workflow#1" would become "workflow_1". If unique IDs
   * are required, callers should ensure IDs only contain alphanumeric
   * characters, underscores, and hyphens before passing them to the engine.
   */
  private getSanitizedStatePath(id: string): string {
    const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${this.stateDir}/${sanitizedId}.json`;
  }
}
