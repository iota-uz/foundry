/**
 * GitService implementation
 * Handles Git operations using simple-git
 */

import simpleGit, { SimpleGit, StatusResult } from 'simple-git';

/**
 * File change information
 */
export interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
}

/**
 * Git status information
 */
export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  changes: FileChange[];
}

/**
 * GitService interface
 */
export interface IGitService {
  getStatus(): Promise<GitStatus>;
  getBranches(): Promise<string[]>;
  checkout(branch: string): Promise<void>;
  commit(message: string, files?: string[]): Promise<void>;
  pull(): Promise<void>;
  push(): Promise<void>;
  hasConflicts(): Promise<boolean>;
}

/**
 * GitService implementation
 */
export class GitService implements IGitService {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Get current Git status
   */
  async getStatus(): Promise<GitStatus> {
    try {
      const status: StatusResult = await this.git.status();

      // Map file changes
      const changes: FileChange[] = [
        ...status.modified.map((file) => ({
          path: file,
          status: 'modified' as const,
        })),
        ...status.created.map((file) => ({
          path: file,
          status: 'added' as const,
        })),
        ...status.deleted.map((file) => ({
          path: file,
          status: 'deleted' as const,
        })),
        ...status.renamed.map((file) => ({
          path: file.to || file.from,
          status: 'renamed' as const,
        })),
        ...status.not_added.map((file) => ({
          path: file,
          status: 'untracked' as const,
        })),
      ];

      return {
        branch: status.current || 'main',
        ahead: status.ahead,
        behind: status.behind,
        changes,
      };
    } catch (error) {
      throw new Error(`Failed to get Git status: ${(error as Error).message}`);
    }
  }

  /**
   * Get list of all branches
   */
  async getBranches(): Promise<string[]> {
    try {
      const branchSummary = await this.git.branchLocal();
      return branchSummary.all;
    } catch (error) {
      throw new Error(
        `Failed to get Git branches: ${(error as Error).message}`
      );
    }
  }

  /**
   * Checkout a branch
   */
  async checkout(branch: string): Promise<void> {
    try {
      await this.git.checkout(branch);
    } catch (error) {
      throw new Error(
        `Failed to checkout branch "${branch}": ${(error as Error).message}`
      );
    }
  }

  /**
   * Commit changes
   */
  async commit(message: string, files?: string[]): Promise<void> {
    try {
      // If specific files provided, add them
      if (files && files.length > 0) {
        await this.git.add(files);
      } else {
        // Otherwise, add all changed files
        await this.git.add('.foundry/*');
      }

      // Commit with message
      await this.git.commit(message);
    } catch (error) {
      throw new Error(`Failed to commit: ${(error as Error).message}`);
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(): Promise<void> {
    try {
      await this.git.pull();
    } catch (error) {
      throw new Error(`Failed to pull: ${(error as Error).message}`);
    }
  }

  /**
   * Push changes to remote
   */
  async push(): Promise<void> {
    try {
      await this.git.push();
    } catch (error) {
      throw new Error(`Failed to push: ${(error as Error).message}`);
    }
  }

  /**
   * Check if there are merge conflicts
   */
  async hasConflicts(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return status.conflicted.length > 0;
    } catch (error) {
      throw new Error(
        `Failed to check for conflicts: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get conflicted files
   */
  async getConflicts(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return status.conflicted;
    } catch (error) {
      throw new Error(
        `Failed to get conflicts: ${(error as Error).message}`
      );
    }
  }

  /**
   * Check if repository is clean (no uncommitted changes)
   */
  async isClean(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return status.isClean();
    } catch (error) {
      throw new Error(`Failed to check if clean: ${(error as Error).message}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status();
      return status.current || 'main';
    } catch (error) {
      throw new Error(
        `Failed to get current branch: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkoutLocalBranch(branchName);
    } catch (error) {
      throw new Error(
        `Failed to create branch "${branchName}": ${(error as Error).message}`
      );
    }
  }

  /**
   * Check if repository has a remote configured
   */
  async hasRemote(): Promise<boolean> {
    try {
      const remotes = await this.git.getRemotes();
      return remotes.length > 0;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create GitService instance
 */
export function createGitService(projectPath: string): GitService {
  return new GitService(projectPath);
}

/**
 * Singleton instance for current project
 */
let gitServiceInstance: GitService | null = null;

export function getGitService(projectPath?: string): GitService {
  if (!gitServiceInstance) {
    if (!projectPath) {
      throw new Error('Project path required to initialize GitService');
    }
    gitServiceInstance = new GitService(projectPath);
  }
  return gitServiceInstance;
}

/**
 * Reset singleton instance
 */
export function resetGitService(): void {
  gitServiceInstance = null;
}
