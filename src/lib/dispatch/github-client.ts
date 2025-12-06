/**
 * GitHub Client for fetching issues with pagination and error handling
 */

import {
  type DispatchConfig,
  type QueuedIssue,
  type DependencyRef,
  DispatchError,
} from './types';

/**
 * GitHub API response for a single issue
 */
interface GitHubIssueResponse {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: Array<{ name: string } | string>;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * GitHub client for fetching issues
 */
export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly owner: string;
  private readonly repo: string;
  private readonly verbose: boolean;

  constructor(config: DispatchConfig) {
    this.baseUrl = 'https://api.github.com';
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.verbose = config.verbose ?? false;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[GitHubClient] ${message}`);
    }
  }

  /**
   * Make an authenticated request to the GitHub API
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    this.log(`Fetching: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');

      if (response.status === 401 || response.status === 403) {
        throw new DispatchError(
          'GitHub authentication failed. Check your token.',
          'GITHUB_AUTH_ERROR',
          { status: response.status, body: errorBody }
        );
      }

      if (response.status === 403) {
        const rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') ?? '1', 10);
        if (rateLimitRemaining === 0) {
          const resetTime = response.headers.get('X-RateLimit-Reset');
          throw new DispatchError(
            `GitHub rate limit exceeded. Resets at ${resetTime ? new Date(Number(resetTime) * 1000).toISOString() : 'unknown'}`,
            'GITHUB_RATE_LIMIT',
            { resetTime }
          );
        }
      }

      if (response.status === 404) {
        throw new DispatchError(
          `Resource not found: ${path}`,
          'GITHUB_NOT_FOUND',
          { path }
        );
      }

      throw new DispatchError(
        `GitHub API error: ${response.status} ${response.statusText}`,
        'GITHUB_API_ERROR',
        { status: response.status, body: errorBody }
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Parse Link header for pagination
   */
  private parseLinkHeader(linkHeader: string | null): { next?: string; last?: string } {
    if (!linkHeader) return {};

    const links: { next?: string; last?: string } = {};
    const parts = linkHeader.split(',');

    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match?.[1] && match[2]) {
        const url = match[1];
        const rel = match[2];
        if (rel === 'next') links.next = url;
        if (rel === 'last') links.last = url;
      }
    }

    return links;
  }

  /**
   * Fetch all issues with a specific label, handling pagination
   */
  async fetchQueuedIssues(label: string = 'queue'): Promise<QueuedIssue[]> {
    const issues: QueuedIssue[] = [];
    let page = 1;
    const perPage = 100; // Max allowed by GitHub API
    let hasMore = true;

    this.log(`Fetching issues with label: ${label}`);

    while (hasMore) {
      const path = `/repos/${this.owner}/${this.repo}/issues?labels=${encodeURIComponent(label)}&state=all&per_page=${perPage}&page=${page}`;

      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new DispatchError(
          `GitHub API error: ${response.status} ${response.statusText}`,
          'GITHUB_API_ERROR',
          { status: response.status, body: errorBody }
        );
      }

      const data = (await response.json()) as GitHubIssueResponse[];
      this.log(`Page ${page}: fetched ${data.length} issues`);

      for (const item of data) {
        issues.push(this.mapToQueuedIssue(item));
      }

      // Check for pagination
      const linkHeader = response.headers.get('Link');
      const links = this.parseLinkHeader(linkHeader);
      hasMore = !!links.next && data.length === perPage;
      page++;
    }

    this.log(`Total issues fetched: ${issues.length}`);
    return issues;
  }

  /**
   * Fetch a single issue by number
   */
  async fetchIssue(owner: string, repo: string, number: number): Promise<QueuedIssue | null> {
    try {
      const path = `/repos/${owner}/${repo}/issues/${number}`;
      const data = await this.request<GitHubIssueResponse>(path);
      return this.mapToQueuedIssue(data, owner, repo);
    } catch (error) {
      if (error instanceof DispatchError && error.code === 'GITHUB_NOT_FOUND') {
        this.log(`Issue not found: ${owner}/${repo}#${number}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if a dependency issue is closed
   */
  async isDependencyClosed(dep: DependencyRef): Promise<boolean> {
    const issue = await this.fetchIssue(dep.owner, dep.repo, dep.number);
    return issue?.state === 'closed';
  }

  /**
   * Map GitHub API response to QueuedIssue
   */
  private mapToQueuedIssue(
    data: GitHubIssueResponse,
    owner: string = this.owner,
    repo: string = this.repo
  ): QueuedIssue {
    return {
      number: data.number,
      title: data.title,
      body: data.body ?? '',
      state: data.state,
      labels: data.labels.map((l) => (typeof l === 'string' ? l : l.name)),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      htmlUrl: data.html_url,
      owner,
      repo,
    };
  }
}

/**
 * Create a GitHub client from config
 */
export function createGitHubClient(config: DispatchConfig): GitHubClient {
  return new GitHubClient(config);
}
