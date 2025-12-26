/**
 * GitHub Issues REST API Client
 *
 * Provides methods for managing labels and assignees on GitHub issues.
 * Uses the REST API v3.
 */

import type {
  GitHubLabel,
  GitHubUser,
  LabelOperationResult,
  AssigneeOperationResult,
  GitHubError,
} from './types';

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Configuration for the GitHub Issues client
 */
export interface IssuesConfig {
  /** GitHub personal access token */
  token: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * GitHub Issues Client
 */
export class IssuesClient {
  private readonly config: IssuesConfig;
  private readonly verbose: boolean;

  constructor(config: IssuesConfig) {
    this.config = config;
    this.verbose = config.verbose ?? false;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[IssuesClient] ${message}`);
    }
  }

  /**
   * Extract error message from caught error
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Make a request to the GitHub REST API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${GITHUB_API_URL}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'foundry-github-issues',
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as GitHubError;
      const message = errorData.message ?? response.statusText;
      throw new Error(`GitHub API error (${response.status}): ${message}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Add labels to an issue
   */
  async addLabels(
    owner: string,
    repo: string,
    issueNumber: number,
    labels: string[]
  ): Promise<LabelOperationResult> {
    try {
      this.log(`Adding labels to ${owner}/${repo}#${issueNumber}: ${labels.join(', ')}`);

      await this.request<GitHubLabel[]>(
        'POST',
        `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
        { labels }
      );

      this.log(`Successfully added labels`);

      return {
        success: true,
        labels,
      };
    } catch (error) {
      return {
        success: false,
        labels,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Remove a label from an issue
   */
  async removeLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    label: string
  ): Promise<void> {
    await this.request(
      'DELETE',
      `/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`
    );
  }

  /**
   * Remove multiple labels from an issue
   */
  async removeLabels(
    owner: string,
    repo: string,
    issueNumber: number,
    labels: string[]
  ): Promise<LabelOperationResult> {
    try {
      this.log(`Removing labels from ${owner}/${repo}#${issueNumber}: ${labels.join(', ')}`);

      // Remove each label individually
      await Promise.all(
        labels.map((label) => this.removeLabel(owner, repo, issueNumber, label))
      );

      this.log(`Successfully removed labels`);

      return {
        success: true,
        labels,
      };
    } catch (error) {
      return {
        success: false,
        labels,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Add assignees to an issue
   */
  async addAssignees(
    owner: string,
    repo: string,
    issueNumber: number,
    assignees: string[]
  ): Promise<AssigneeOperationResult> {
    try {
      this.log(`Adding assignees to ${owner}/${repo}#${issueNumber}: ${assignees.join(', ')}`);

      await this.request(
        'POST',
        `/repos/${owner}/${repo}/issues/${issueNumber}/assignees`,
        { assignees }
      );

      this.log(`Successfully added assignees`);

      return {
        success: true,
        assignees,
      };
    } catch (error) {
      return {
        success: false,
        assignees,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Remove assignees from an issue
   */
  async removeAssignees(
    owner: string,
    repo: string,
    issueNumber: number,
    assignees: string[]
  ): Promise<AssigneeOperationResult> {
    try {
      this.log(`Removing assignees from ${owner}/${repo}#${issueNumber}: ${assignees.join(', ')}`);

      await this.request(
        'DELETE',
        `/repos/${owner}/${repo}/issues/${issueNumber}/assignees`,
        { assignees }
      );

      this.log(`Successfully removed assignees`);

      return {
        success: true,
        assignees,
      };
    } catch (error) {
      return {
        success: false,
        assignees,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Get all labels for a repository
   */
  async getRepositoryLabels(owner: string, repo: string): Promise<GitHubLabel[]> {
    this.log(`Fetching labels for ${owner}/${repo}`);
    const labels = await this.request<GitHubLabel[]>(
      'GET',
      `/repos/${owner}/${repo}/labels`
    );
    this.log(`Found ${labels.length} labels`);
    return labels;
  }

  /**
   * Get collaborators for a repository
   */
  async getRepositoryCollaborators(owner: string, repo: string): Promise<GitHubUser[]> {
    this.log(`Fetching collaborators for ${owner}/${repo}`);
    const collaborators = await this.request<GitHubUser[]>(
      'GET',
      `/repos/${owner}/${repo}/collaborators`
    );
    this.log(`Found ${collaborators.length} collaborators`);
    return collaborators;
  }
}
