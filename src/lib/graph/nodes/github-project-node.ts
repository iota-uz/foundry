/**
 * @sys/graph - GitHubProjectNode Implementation
 *
 * Updates issue status in GitHub Projects V2 via GraphQL API.
 * Supports intermediate status transitions at any workflow step.
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from './base';
import type { WorkflowState, GraphContext, Transition } from '../types';
import {
  ProjectsClient,
  type ProjectsConfig,
  ProjectsError,
} from '../../github-projects';

/**
 * Result of a GitHub Project status update.
 */
export interface GitHubProjectResult {
  /** Whether the update succeeded */
  success: boolean;

  /** The new status value */
  newStatus: string;

  /** Previous status (if available) */
  previousStatus?: string;

  /** Issue number that was updated */
  issueNumber: number;

  /** Repository reference */
  repository: string;

  /** Error message if update failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Configuration for GitHubProjectNode.
 *
 * All configuration is explicit - no automatic environment variable fallbacks.
 * If you need to use environment variables, pass them explicitly:
 *
 * @example
 * ```typescript
 * nodes.GitHubProjectNode({
 *   token: process.env.GITHUB_TOKEN!,
 *   projectOwner: process.env.GITHUB_PROJECT_OWNER!,
 *   projectNumber: Number(process.env.GITHUB_PROJECT_NUMBER),
 *   owner: process.env.GITHUB_REPOSITORY_OWNER!,
 *   repo: process.env.GITHUB_REPOSITORY_NAME!,
 *   status: 'In Progress',
 *   next: 'WORK',
 * })
 * ```
 */
export interface GitHubProjectNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * GitHub personal access token with `project` scope.
   * Required.
   */
  token: string;

  /**
   * Project owner (user or organization login).
   * Required.
   */
  projectOwner: string;

  /**
   * Project number (visible in project URL).
   * Required.
   */
  projectNumber: number;

  /**
   * Repository owner.
   * Required.
   */
  owner: string;

  /**
   * Repository name.
   * Required.
   */
  repo: string;

  /**
   * Target status to set (must exactly match a project option).
   * Case-insensitive matching.
   * Required.
   */
  status: string;

  /**
   * Issue number to update.
   * Either provide this directly or use `issueNumberKey` to read from context.
   */
  issueNumber?: number;

  /**
   * Key in workflow context to read issue number from.
   * Used when `issueNumber` is not provided.
   * @default 'issueNumber'
   */
  issueNumberKey?: string;

  /**
   * Whether to throw on update failure.
   * @default true
   */
  throwOnError?: boolean;

  /**
   * Key in context to store the result.
   * @default 'lastProjectResult'
   */
  resultKey?: string;

  /**
   * Enable verbose logging.
   * @default false
   */
  verbose?: boolean;
}

/**
 * GitHubProjectNode - Updates issue status in GitHub Projects.
 *
 * All configuration is explicit - pass values directly or use process.env.
 *
 * @example
 * ```typescript
 * // With explicit values
 * nodes.GitHubProjectNode({
 *   token: 'ghp_xxx',
 *   projectOwner: 'myorg',
 *   projectNumber: 1,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   status: 'In Progress',
 *   next: 'WORK',
 * })
 *
 * // With environment variables
 * nodes.GitHubProjectNode({
 *   token: process.env.GITHUB_TOKEN!,
 *   projectOwner: process.env.PROJECT_OWNER!,
 *   projectNumber: Number(process.env.PROJECT_NUMBER),
 *   owner: process.env.REPO_OWNER!,
 *   repo: process.env.REPO_NAME!,
 *   issueNumberKey: 'currentIssue', // read from context
 *   status: 'Done',
 *   next: 'END',
 * })
 * ```
 */
export class GitHubProjectNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, GitHubProjectNodeConfig<TContext>> {

  public readonly nodeType = 'github-project';

  /** Cached client instance */
  private client: ProjectsClient | null = null;

  constructor(config: GitHubProjectNodeConfig<TContext>) {
    super({
      ...config,
      throwOnError: config.throwOnError ?? true,
      resultKey: config.resultKey ?? 'lastProjectResult',
      issueNumberKey: config.issueNumberKey ?? 'issueNumber',
      verbose: config.verbose ?? false,
    });

    // Validate required fields at construction time
    this.validateConfig();
  }

  /**
   * Validates required configuration fields.
   */
  private validateConfig(): void {
    const { token, projectOwner, projectNumber, owner, repo, status } = this.config;

    const missing: string[] = [];
    if (!token) missing.push('token');
    if (!projectOwner) missing.push('projectOwner');
    if (!projectNumber) missing.push('projectNumber');
    if (!owner) missing.push('owner');
    if (!repo) missing.push('repo');
    if (!status) missing.push('status');

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
   * Executes the status update.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      token,
      projectOwner,
      projectNumber,
      owner,
      repo,
      status,
      throwOnError,
      resultKey,
      verbose,
    } = this.config;

    const startTime = Date.now();

    try {
      const issueNumber = this.resolveIssueNumber(state);

      context.logger.info(
        `[GitHubProjectNode] Updating ${owner}/${repo}#${issueNumber} to "${status}"`
      );

      // Create project config
      const projectConfig: ProjectsConfig = {
        token,
        projectOwner,
        projectNumber,
      };

      if (verbose) {
        projectConfig.verbose = true;
      }

      // Create and validate client
      const client = await this.getClient(projectConfig, context);

      // Get current status if possible
      let previousStatus: string | undefined;
      try {
        const current = await client.getIssueStatus(owner, repo, issueNumber);
        previousStatus = current ?? undefined;
        if (verbose) {
          context.logger.info(`[GitHubProjectNode] Current status: ${previousStatus ?? 'none'}`);
        }
      } catch {
        // Ignore - issue might not be in project yet
      }

      // Update status
      const updateResult = await client.updateStatus({
        owner,
        repo,
        issueNumber,
        status,
      });

      const duration = Date.now() - startTime;

      const result: GitHubProjectResult = {
        success: updateResult.success,
        newStatus: updateResult.newStatus,
        issueNumber,
        repository: `${owner}/${repo}`,
        duration,
        ...(previousStatus !== undefined && { previousStatus }),
        ...(updateResult.error !== undefined && { error: updateResult.error }),
      };

      if (!updateResult.success && throwOnError) {
        throw new NodeExecutionError(
          `Failed to update project status: ${updateResult.error}`,
          `${owner}/${repo}#${issueNumber}`,
          this.nodeType,
          undefined,
          { status, result }
        );
      }

      context.logger.info(
        `[GitHubProjectNode] Updated to "${result.newStatus}" in ${duration}ms`
      );

      // Store result in context
      const contextUpdate = {
        ...state.context,
        [resultKey!]: result,
      } as TContext;

      return {
        stateUpdate: {
          context: contextUpdate,
        },
        metadata: {
          duration,
          previousStatus,
          newStatus: result.newStatus,
        },
      };
    } catch (error) {
      const err = error as Error;

      if (err instanceof NodeExecutionError) {
        throw err;
      }

      const duration = Date.now() - startTime;

      if (err instanceof ProjectsError) {
        throw new NodeExecutionError(
          `GitHub Projects error: ${err.message}`,
          status,
          this.nodeType,
          err,
          { code: err.code, details: err.details }
        );
      }

      throw new NodeExecutionError(
        `Status update failed: ${err.message}`,
        status,
        this.nodeType,
        err,
        { duration }
      );
    }
  }

  /**
   * Resolves issue number from config or context.
   */
  private resolveIssueNumber(state: WorkflowState<TContext>): number {
    // Direct config takes precedence
    if (this.config.issueNumber !== undefined) {
      return this.config.issueNumber;
    }

    // Read from context
    const key = this.config.issueNumberKey ?? 'issueNumber';
    const contextValue = (state.context as Record<string, unknown>)[key];

    if (typeof contextValue === 'number') {
      return contextValue;
    }

    if (typeof contextValue === 'string') {
      const parsed = parseInt(contextValue, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    throw new NodeExecutionError(
      `Issue number not found. Provide 'issueNumber' in config or set '${key}' in workflow context.`,
      'config',
      this.nodeType
    );
  }

  /**
   * Gets or creates a validated ProjectsClient.
   */
  private async getClient(
    config: ProjectsConfig,
    context: GraphContext
  ): Promise<ProjectsClient> {
    if (this.client) {
      return this.client;
    }

    const client = new ProjectsClient(config);
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

    if (validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        context.logger.warn(`[GitHubProjectNode] Warning: ${warning}`);
      }
    }

    // Validate the target status exists
    if (!client.isValidStatus(this.config.status)) {
      const available = client.getAvailableStatuses().join(', ');
      throw new NodeExecutionError(
        `Status "${this.config.status}" not found in project. Available: ${available}`,
        'validation',
        this.nodeType,
        undefined,
        { requestedStatus: this.config.status, availableStatuses: available }
      );
    }

    this.client = client;
    return client;
  }
}

/**
 * Factory function to create a GitHubProjectNode definition.
 *
 * @example
 * ```typescript
 * nodes.GitHubProjectNode({
 *   token: process.env.GITHUB_TOKEN!,
 *   projectOwner: 'myorg',
 *   projectNumber: 1,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   status: 'In Progress',
 *   next: 'WORK',
 * })
 * ```
 */
export function createGitHubProjectNode<TContext extends Record<string, unknown>>(
  config: Omit<GitHubProjectNodeConfig<TContext>, 'next'> & {
    next: Transition<TContext>;
  }
): GitHubProjectNodeConfig<TContext> {
  return config;
}
