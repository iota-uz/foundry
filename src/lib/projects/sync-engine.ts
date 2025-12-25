/**
 * GitHub Project Sync Engine
 *
 * Core sync logic for pulling project items from GitHub and updating local state.
 * Detects status changes and pushes updates back to GitHub.
 */

import { ProjectsClient, createProjectsClient } from '@/lib/github-projects/client';
import type { ProjectsConfig, ProjectValidation, ProjectItemWithFields } from '@/lib/github-projects/types';
import type { Project } from '@/lib/db/schema';
import {
  upsertIssueMetadata,
  listIssueMetadata,
  updateCurrentStatus,
  type IssueMetadata,
} from '@/lib/db/repositories/issue-metadata.repository';
import { updateLastSynced } from '@/lib/db/repositories/project.repository';

/**
 * Result of validating a project's GitHub configuration
 */
export interface SyncValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  statusOptions: string[] | undefined;
}

/**
 * Details of a status change detected during sync
 */
export interface StatusChange {
  issueMetadataId: string;
  owner: string;
  repo: string;
  issueNumber: number;
  fromStatus: string | null;
  toStatus: string;
}

/**
 * Result of syncing project items from GitHub
 */
export interface SyncResult {
  synced: number;
  added: number;
  updated: number;
  statusChanges: StatusChange[];
  errors: string[];
}

/**
 * GitHub Project Sync Engine
 */
export class SyncEngine {
  /**
   * Initialize ProjectsClient and validate connection
   */
  async validateProject(project: Project): Promise<SyncValidationResult> {
    try {
      const config: ProjectsConfig = {
        token: project.githubToken,
        projectOwner: project.githubProjectOwner,
        projectNumber: project.githubProjectNumber,
        verbose: false,
      };

      const client = createProjectsClient(config);
      const validation: ProjectValidation = await client.validate();

      return {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        statusOptions: validation.statusOptions?.map((opt) => opt.name),
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        statusOptions: undefined,
      };
    }
  }

  /**
   * Fetch all items from GitHub Project and update issue_metadata
   */
  async syncProjectItems(projectId: string, project: Project): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      added: 0,
      updated: 0,
      statusChanges: [],
      errors: [],
    };

    try {
      const config: ProjectsConfig = {
        token: project.githubToken,
        projectOwner: project.githubProjectOwner,
        projectNumber: project.githubProjectNumber,
        verbose: false,
      };

      const client = createProjectsClient(config);

      // Validate first
      await client.validate();

      // Fetch all project items
      const items = await this.fetchAllProjectItems(client);

      // Sync each item to local database
      for (const item of items) {
        if (!item.content) {
          continue;
        }

        const { owner, name: repo } = item.content.repository;
        const issueNumber = item.content.number;
        const currentStatus = item.fieldValues['status'] ?? null;

        try {
          // Get existing metadata
          const existingMetadata = await this.getExistingMetadata(
            projectId,
            owner.login,
            repo,
            issueNumber
          );

          const isNew = !existingMetadata;
          const statusChanged = existingMetadata && existingMetadata.currentStatus !== currentStatus;

          // Upsert metadata
          const metadata = await upsertIssueMetadata({
            projectId,
            githubIssueId: item.content.id,
            githubItemId: item.id,
            owner: owner.login,
            repo,
            issueNumber,
            currentStatus,
            lastSyncedAt: new Date(),
          });

          result.synced++;
          if (isNew) {
            result.added++;
          } else {
            result.updated++;
          }

          // Track status changes
          if (statusChanged && currentStatus) {
            result.statusChanges.push({
              issueMetadataId: metadata.id,
              owner: owner.login,
              repo,
              issueNumber,
              fromStatus: existingMetadata?.currentStatus ?? null,
              toStatus: currentStatus,
            });
          }
        } catch (error) {
          result.errors.push(
            `Failed to sync ${owner.login}/${repo}#${issueNumber}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Update last synced timestamp
      await updateLastSynced(projectId);

      return result;
    } catch (error) {
      result.errors.push(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return result;
    }
  }

  /**
   * Detect status changes by comparing GitHub state with local state
   */
  async detectStatusChanges(
    projectId: string,
    items: ProjectItemWithFields[]
  ): Promise<StatusChange[]> {
    const changes: StatusChange[] = [];

    for (const item of items) {
      if (!item.content) {
        continue;
      }

      const { owner, name: repo } = item.content.repository;
      const issueNumber = item.content.number;
      const githubStatus = item.fieldValues['status'] ?? null;

      const metadata = await this.getExistingMetadata(
        projectId,
        owner.login,
        repo,
        issueNumber
      );

      if (metadata && metadata.currentStatus !== githubStatus && githubStatus) {
        changes.push({
          issueMetadataId: metadata.id,
          owner: owner.login,
          repo,
          issueNumber,
          fromStatus: metadata.currentStatus,
          toStatus: githubStatus,
        });
      }
    }

    return changes;
  }

  /**
   * Push status change to GitHub
   */
  async pushStatusToGitHub(
    project: Project,
    issue: IssueMetadata,
    newStatus: string
  ): Promise<void> {
    const config: ProjectsConfig = {
      token: project.githubToken,
      projectOwner: project.githubProjectOwner,
      projectNumber: project.githubProjectNumber,
      verbose: false,
    };

    const client = createProjectsClient(config);
    await client.validate();

    const result = await client.updateStatus({
      owner: issue.owner,
      repo: issue.repo,
      issueNumber: issue.issueNumber,
      status: newStatus,
    });

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to update status on GitHub');
    }

    // Update local state
    await updateCurrentStatus(issue.id, newStatus);
  }

  /**
   * Fetch all items from GitHub Project across all statuses
   */
  private async fetchAllProjectItems(client: ProjectsClient): Promise<ProjectItemWithFields[]> {
    const statuses = client.getAvailableStatuses();
    const allItems: ProjectItemWithFields[] = [];

    for (const status of statuses) {
      const items = await client.fetchItemsByStatus({ status });
      allItems.push(...items);
    }

    // Also fetch items with no status
    // Note: GitHub GraphQL doesn't allow filtering by null status,
    // so we rely on the client's fetchItemsByStatus implementation
    // which returns all items and filters client-side

    return allItems;
  }

  /**
   * Get existing metadata for an issue
   */
  private async getExistingMetadata(
    projectId: string,
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<IssueMetadata | undefined> {
    // Use listIssueMetadata and filter since we don't have getIssueMetadataByIssue exported
    const allMetadata = await listIssueMetadata(projectId);
    return allMetadata.find(
      (m) => m.owner === owner && m.repo === repo && m.issueNumber === issueNumber
    );
  }
}

/**
 * Create a new SyncEngine instance
 */
export function createSyncEngine(): SyncEngine {
  return new SyncEngine();
}
