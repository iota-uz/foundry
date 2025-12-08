/**
 * @sys/graph - FetchIssuesNode Implementation
 *
 * Fetches issues from various sources (label-based, project-based).
 * Extensible design supports multiple issue source strategies.
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext } from '../../types';
import {
  ProjectsClient,
  type ProjectsConfig,
  type ProjectItemWithFields,
  ProjectsError,
} from '../../../github-projects';
import type { QueuedIssue } from '../../../dispatch/types';

/**
 * Supported issue source types.
 */
export type IssueSourceType = 'label' | 'project';

/**
 * Result of fetching issues.
 */
export interface FetchIssuesResult {
  /** Whether the fetch succeeded */
  success: boolean;

  /** Fetched issues */
  issues: QueuedIssue[];

  /** Source type that was used */
  sourceType: IssueSourceType;

  /** Error message if fetch failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Configuration for FetchIssuesNode.
 *
 * Supports fetching from:
 * - Labels: Issues with a specific label (e.g., "queue")
 * - Project: Issues in a specific status column (e.g., "Ready")
 */
export interface FetchIssuesNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * Source type for fetching issues.
   * - 'label': Fetch issues by label
   * - 'project': Fetch issues from GitHub Project column
   */
  sourceType: IssueSourceType;

  /**
   * GitHub personal access token.
   */
  token: string;

  /**
   * Repository owner (e.g., 'iota-uz').
   */
  owner: string;

  /**
   * Repository name (e.g., 'iota-sdk').
   */
  repo: string;

  // === Label source options ===

  /**
   * Label to filter issues (for 'label' source type).
   * @default 'queue'
   */
  label?: string;

  // === Project source options ===

  /**
   * Project owner (for 'project' source type).
   * Usually the same as `owner`, but can be different for org-level projects.
   */
  projectOwner?: string;

  /**
   * Project number (visible in project URL).
   */
  projectNumber?: number;

  /**
   * Status value to filter by (for 'project' source type).
   * @default 'Ready'
   */
  readyStatus?: string;

  /**
   * Priority field name in the project.
   * @default 'Priority'
   */
  priorityField?: string;

  /**
   * Key in context to store the result.
   * @default 'fetchIssuesResult'
   */
  resultKey?: string;

  /**
   * Key in context to store the issues array.
   * @default 'issues'
   */
  issuesKey?: string;

  /**
   * Whether to throw on fetch failure.
   * @default true
   */
  throwOnError?: boolean;

  /**
   * Enable verbose logging.
   * @default false
   */
  verbose?: boolean;
}

/**
 * FetchIssuesNode - Fetches issues from various sources.
 *
 * @example
 * ```typescript
 * // Fetch from GitHub Project "Ready" column
 * schema.custom('FETCH_ISSUES', {
 *   nodeType: 'fetch-issues',
 *   sourceType: 'project',
 *   projectOwner: 'iota-uz',
 *   projectNumber: 14,
 *   readyStatus: 'Ready',
 *   token: process.env.GITHUB_TOKEN!,
 *   owner: 'iota-uz',
 *   repo: 'iota-sdk',
 *   then: () => 'BUILD_DAG',
 * })
 *
 * // Fetch by label
 * schema.custom('FETCH_ISSUES', {
 *   nodeType: 'fetch-issues',
 *   sourceType: 'label',
 *   label: 'queue',
 *   token: process.env.GITHUB_TOKEN!,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   then: () => 'BUILD_DAG',
 * })
 * ```
 */
export class FetchIssuesNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, FetchIssuesNodeConfig<TContext>> {

  public readonly nodeType = 'fetch-issues';

  constructor(config: FetchIssuesNodeConfig<TContext>) {
    super({
      ...config,
      label: config.label ?? 'queue',
      readyStatus: config.readyStatus ?? 'Ready',
      priorityField: config.priorityField ?? 'Priority',
      resultKey: config.resultKey ?? 'fetchIssuesResult',
      issuesKey: config.issuesKey ?? 'issues',
      throwOnError: config.throwOnError ?? true,
      verbose: config.verbose ?? false,
    });

    this.validateConfig();
  }

  /**
   * Validates required configuration fields.
   */
  private validateConfig(): void {
    const { sourceType, token, owner, repo, projectOwner, projectNumber } = this.config;

    const missing: string[] = [];
    if (!sourceType) missing.push('sourceType');
    if (!token) missing.push('token');
    if (!owner) missing.push('owner');
    if (!repo) missing.push('repo');

    if (sourceType === 'project') {
      if (!projectOwner) missing.push('projectOwner');
      if (!projectNumber) missing.push('projectNumber');
    }

    if (missing.length > 0) {
      throw new NodeExecutionError(
        `Missing required configuration: ${missing.join(', ')}`,
        'config',
        this.nodeType,
        undefined,
        { missing }
      );
    }
  }

  /**
   * Executes the issue fetch.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      sourceType,
      throwOnError,
      resultKey,
      issuesKey,
    } = this.config;

    const startTime = Date.now();

    try {
      context.logger.info(
        `[FetchIssuesNode] Fetching issues using '${sourceType}' source`
      );

      let issues: QueuedIssue[];

      if (sourceType === 'project') {
        issues = await this.fetchFromProject(context);
      } else {
        issues = await this.fetchFromLabel(context);
      }

      const duration = Date.now() - startTime;

      const result: FetchIssuesResult = {
        success: true,
        issues,
        sourceType,
        duration,
      };

      context.logger.info(
        `[FetchIssuesNode] Fetched ${issues.length} issues in ${duration}ms`
      );

      // Store result in context
      const contextUpdate = {
        ...state.context,
        [resultKey!]: result,
        [issuesKey!]: issues,
        sourceType,
      } as TContext;

      return {
        stateUpdate: {
          context: contextUpdate,
        },
        metadata: {
          duration,
          issueCount: issues.length,
          sourceType,
        },
      };
    } catch (error) {
      const err = error as Error;

      if (err instanceof NodeExecutionError) {
        throw err;
      }

      const duration = Date.now() - startTime;

      if (err instanceof ProjectsError) {
        if (throwOnError) {
          throw new NodeExecutionError(
            `GitHub Projects error: ${err.message}`,
            'projects',
            this.nodeType,
            err,
            { code: err.code, details: err.details }
          );
        }

        const result: FetchIssuesResult = {
          success: false,
          issues: [],
          sourceType,
          error: err.message,
          duration,
        };

        return {
          stateUpdate: {
            context: {
              ...state.context,
              [resultKey!]: result,
              [issuesKey!]: [],
              sourceType,
            } as TContext,
          },
          metadata: { duration, error: err.message },
        };
      }

      if (throwOnError) {
        throw new NodeExecutionError(
          `Failed to fetch issues: ${err.message}`,
          'fetch',
          this.nodeType,
          err,
          { duration }
        );
      }

      const result: FetchIssuesResult = {
        success: false,
        issues: [],
        sourceType,
        error: err.message,
        duration,
      };

      return {
        stateUpdate: {
          context: {
            ...state.context,
            [resultKey!]: result,
            [issuesKey!]: [],
            sourceType,
          } as TContext,
        },
        metadata: { duration, error: err.message },
      };
    }
  }

  /**
   * Fetches issues from GitHub Project by status.
   */
  private async fetchFromProject(context: GraphContext): Promise<QueuedIssue[]> {
    const {
      token,
      projectOwner,
      projectNumber,
      readyStatus,
      priorityField,
      verbose,
    } = this.config;

    context.logger.info(
      `[FetchIssuesNode] Fetching from project ${projectOwner}#${projectNumber} status="${readyStatus}"`
    );

    const projectConfig: ProjectsConfig = {
      token,
      projectOwner: projectOwner!,
      projectNumber: projectNumber!,
      ...(verbose ? { verbose: true } : {}),
    };

    const client = new ProjectsClient(projectConfig);
    const validation = await client.validate();

    if (!validation.valid) {
      throw new NodeExecutionError(
        `Project validation failed: ${validation.errors.join(', ')}`,
        'validation',
        this.nodeType,
        undefined,
        { errors: validation.errors, warnings: validation.warnings }
      );
    }

    const items = await client.fetchItemsByStatus({ status: readyStatus! });

    // Convert ProjectItemWithFields to QueuedIssue
    return items.map((item) => this.projectItemToQueuedIssue(item, priorityField!));
  }

  /**
   * Fetches issues from GitHub by label.
   */
  private async fetchFromLabel(context: GraphContext): Promise<QueuedIssue[]> {
    const { token, owner, repo, label } = this.config;

    context.logger.info(
      `[FetchIssuesNode] Fetching from ${owner}/${repo} with label="${label}"`
    );

    // Use GitHub REST API to fetch issues by label
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(label!)}&state=open&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'foundry-dispatch',
        },
      }
    );

    if (!response.ok) {
      throw new NodeExecutionError(
        `GitHub API error: ${response.status} ${response.statusText}`,
        'github-api',
        this.nodeType,
        undefined,
        { status: response.status }
      );
    }

    interface GitHubIssue {
      number: number;
      title: string;
      body: string | null;
      state: 'open' | 'closed';
      labels: Array<{ name: string }>;
      created_at: string;
      updated_at: string;
      html_url: string;
    }

    const issues = (await response.json()) as GitHubIssue[];

    // Fetch sub-issues for each issue
    const queuedIssues: QueuedIssue[] = [];

    for (const issue of issues) {
      const subIssueNumbers = await this.fetchSubIssueNumbers(owner, repo, issue.number);

      queuedIssues.push({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? '',
        state: issue.state,
        labels: issue.labels.map((l) => l.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        htmlUrl: issue.html_url,
        owner,
        repo,
        subIssueNumbers,
        parentIssueNumber: null,
      });
    }

    return queuedIssues;
  }

  /**
   * Fetches sub-issue numbers for a given issue using GraphQL.
   */
  private async fetchSubIssueNumbers(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<number[]> {
    const { token } = this.config;

    const query = `
      query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            subIssues(first: 50) {
              nodes {
                number
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'foundry-dispatch',
        },
        body: JSON.stringify({
          query,
          variables: { owner, repo, number: issueNumber },
        }),
      });

      if (!response.ok) {
        return [];
      }

      interface SubIssuesResponse {
        data: {
          repository: {
            issue: {
              subIssues: {
                nodes: Array<{ number: number }>;
              };
            } | null;
          } | null;
        };
      }

      const data = (await response.json()) as SubIssuesResponse;
      const subIssues = data.data?.repository?.issue?.subIssues?.nodes ?? [];

      return subIssues.map((s) => s.number);
    } catch {
      // Sub-issues query might fail if feature is not available
      return [];
    }
  }

  /**
   * Converts a ProjectItemWithFields to a QueuedIssue.
   */
  private projectItemToQueuedIssue(
    item: ProjectItemWithFields,
    priorityField: string
  ): QueuedIssue {
    const content = item.content!;
    const priority = item.fieldValues[priorityField.toLowerCase()];

    // Build labels array from priority
    const labels: string[] = [];
    if (priority) {
      labels.push(`priority:${priority.toLowerCase()}`);
    }

    return {
      number: content.number,
      title: content.title,
      body: content.body,
      state: content.state === 'OPEN' ? 'open' : 'closed',
      labels,
      createdAt: '', // Not available from project items
      updatedAt: '', // Not available from project items
      htmlUrl: `https://github.com/${content.repository.owner.login}/${content.repository.name}/issues/${content.number}`,
      owner: content.repository.owner.login,
      repo: content.repository.name,
      subIssueNumbers: [], // Will be populated by DAG builder
      parentIssueNumber: null,
      // Store project-specific data
      projectPriority: priority,
    } as QueuedIssue & { projectPriority?: string };
  }
}

/**
 * Factory function to create a FetchIssuesNode definition.
 */
export function createFetchIssuesNode<TContext extends Record<string, unknown>>(
  config: Omit<FetchIssuesNodeConfig<TContext>, 'next'> & {
    next: (state: WorkflowState<TContext>) => string;
  }
): FetchIssuesNodeConfig<TContext> {
  return config;
}
