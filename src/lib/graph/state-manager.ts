/**
 * @sys/graph - State Persistence Manager
 *
 * Handles atomic read/write operations for workflow state using Bun's native file I/O.
 * Ensures data integrity during crashes via atomic write patterns.
 */

import type { BaseState } from './types';

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
    const filePath = this.getStatePath(id);

    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return null;
      }

      const content = await file.text();
      return JSON.parse(content) as TState;
    } catch (error) {
      // If the file is corrupted or unreadable, log and return null
      console.error(`Failed to load state for workflow ${id}:`, error);
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
    const filePath = this.getStatePath(id);
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
      } catch {
        // Ignore cleanup errors
      }

      throw new Error(`Failed to save state for workflow ${id}: ${error}`);
    }
  }

  /**
   * Deletes workflow state from disk.
   *
   * @param id - Unique workflow identifier
   */
  async delete(id: string): Promise<void> {
    const filePath = this.getStatePath(id);

    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error: any) {
      // Ignore if file doesn't exist
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete state for workflow ${id}: ${error}`);
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
      console.error('Failed to list workflows:', error);
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
      throw new Error(`Failed to create state directory: ${error}`);
    }
  }

  /**
   * Gets the full file path for a workflow's state file.
   */
  private getStatePath(id: string): string {
    // Sanitize the ID to prevent path traversal
    const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${this.stateDir}/${sanitizedId}.json`;
  }
}
