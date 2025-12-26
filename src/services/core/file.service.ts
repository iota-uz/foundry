/**
 * FileService implementation
 * Handles all file system operations for YAML, text, and directory management
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import {
  readYaml,
  writeYaml,
  atomicWrite,
} from '@/lib/fs';
import { ensureDir, fileExists } from '@/lib/fs/paths';

// Define WatchEvent type inline to avoid importing watcher module
export interface WatchEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
}

/**
 * FileService interface
 */
export interface IFileService {
  // YAML operations
  readYaml<T>(path: string): Promise<T>;
  writeYaml<T>(path: string, data: T): Promise<void>;

  // Text operations
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;

  // Directory operations
  exists(path: string): Promise<boolean>;
  ensureDir(path: string): Promise<void>;
  list(directory: string, pattern?: string): Promise<string[]>;

  // File watching
  watch(path: string, callback: (event: WatchEvent) => void): () => void;
}

/**
 * FileService implementation
 */
export class FileService implements IFileService {
  /**
   * Read and parse a YAML file
   */
  async readYaml<T>(filePath: string): Promise<T> {
    try {
      return await readYaml<T>(filePath);
    } catch (error) {
      throw new Error(
        `Failed to read YAML file: ${(error as Error).message}`
      );
    }
  }

  /**
   * Write data to a YAML file
   */
  async writeYaml<T>(filePath: string, data: T): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await this.ensureDir(dir);

      // Write YAML file
      await writeYaml(filePath, data);
    } catch (error) {
      throw new Error(
        `Failed to write YAML file: ${(error as Error).message}`
      );
    }
  }

  /**
   * Read text file
   */
  async readText(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  /**
   * Write text file atomically
   */
  async writeText(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await this.ensureDir(dir);

      // Write atomically
      await atomicWrite(filePath, content);
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  /**
   * Check if file or directory exists
   */
  async exists(targetPath: string): Promise<boolean> {
    return await fileExists(targetPath);
  }

  /**
   * Ensure directory exists (create if not)
   */
  async ensureDir(dirPath: string): Promise<void> {
    await ensureDir(dirPath);
  }

  /**
   * List files in directory with optional glob pattern
   */
  async list(directory: string, pattern?: string): Promise<string[]> {
    try {
      if (pattern !== undefined && pattern !== null && pattern !== '') {
        // Use glob pattern
        const searchPattern = path.join(directory, pattern);
        const files = await glob(searchPattern, { nodir: true });
        return files.sort();
      } else {
        // List all files in directory
        const entries = await fs.readdir(directory, { withFileTypes: true });
        const files = entries
          .filter((entry) => entry.isFile())
          .map((entry) => path.join(directory, entry.name));
        return files.sort();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new Error(
        `Failed to list directory: ${(error as Error).message}`
      );
    }
  }

  /**
   * Watch a file or directory for changes
   * Only available in Node.js environment
   */
  watch(
    targetPath: string,
    callback: (event: WatchEvent) => void
  ): () => void {
    // Dynamically import watcher to avoid bundling in client builds
    if (typeof window === 'undefined') {
      // Server-side only
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const { watch } = require('@/lib/fs/watcher');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return watch(targetPath, callback);
    }
    // Client-side: return no-op cleanup function
    return () => {};
  }

  /**
   * Copy file
   */
  async copy(source: string, destination: string): Promise<void> {
    try {
      const dir = path.dirname(destination);
      await this.ensureDir(dir);
      await fs.copyFile(source, destination);
    } catch (error) {
      throw new Error(`Failed to copy file: ${(error as Error).message}`);
    }
  }

  /**
   * Delete file or directory
   */
  async delete(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        await this.deleteDirectory(filePath);
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File/directory doesn't exist, that's fine
        return;
      }
      throw new Error(`Failed to delete: ${(error as Error).message}`);
    }
  }

  /**
   * Delete directory recursively
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist, that's fine
        return;
      }
      throw new Error(`Failed to delete directory: ${(error as Error).message}`);
    }
  }

  /**
   * Get file stats
   */
  async stat(
    filePath: string
  ): Promise<{ size: number; mtime: Date; isFile: boolean; isDirectory: boolean }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${(error as Error).message}`);
    }
  }
}

/**
 * Create singleton instance
 */
let fileServiceInstance: FileService | null = null;

export function getFileService(): FileService {
  if (!fileServiceInstance) {
    fileServiceInstance = new FileService();
  }
  return fileServiceInstance;
}
