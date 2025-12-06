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
 */
export interface GitHubProjectNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * Target status to set (must exactly match a project option).
   * Case-insensitive matching.
   */
  status: string;

  /**
   * GitHub token (defaults to GITHUB_TOKEN env var).
   */
  token?: string;

  /**
   * Project owner (user or organization).
   * Defaults to GITHUB_PROJECT_OWNER or parsed from GITHUB_REPOSITORY.
   */
  projectOwner?: string;

  /**
   * Project number (visible in project URL).
   * Defaults to GITHUB_PROJECT_NUMBER env var.
   */
  projectNumber?: number;

  /**
   * Static issue number to update.
   * Mutually exclusive with issueNumberKey.
   */
  issueNumber?: number;

  /**
   * Key in context to read issue number from.
   * Allows dynamic issue resolution from workflow state.
   * Defaults to 'issueNumber'.
   */
  issueNumberKey?: string;

  /**
   * Repository owner.
   * Defaults to parsed from GITHUB_REPOSITORY.
   */
  owner?: string;

  /**
   * Repository name.
   * Defaults to parsed from GITHUB_REPOSITORY.
   */
  repo?: string;

  /**
   * Whether to throw on update failure.
   * Default: true
   */
  throwOnError?: boolean;

  /**
   * Key in context to store the result.
   * Default: 'lastProjectResult'
   */
  resultKey?: string;

  /**
   * Enable verbose logging.
   * Default: false
   */
  verbose?: boolean;
}

/**
 * GitHubProjectNode - Updates issue status in GitHub Projects.
 *
 * Features:
 * - Updates to any status at any workflow step
 * - Validates project and status options at startup
 * - Auto-adds issues to project if not present
 * - Stores results in workflow context
 *
 * @example
 * ```typescript
 * const startNode = new GitHubProjectNodeRuntime<MyContext>({
 *   status: 'In Progress',
 *   next: 'WORK'
 * });
 *
 * const doneNode = new GitHubProjectNodeRuntime<MyContext>({
 *   status: 'Done',
 *   next: 'END'
 * });
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
  }

  /**
   * Executes the status update.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      status,
      throwOnError,
      resultKey,
      verbose,
    } = this.config;

    const startTime = Date.now();

    try {
      // Resolve configuration
      const projectConfig = this.resolveProjectConfig();
      const { owner, repo, issueNumber } = this.resolveIssueInfo(state);

      context.logger.info(
        `[GitHubProjectNode] Updating ${owner}/${repo}#${issueNumber} to "${status}"`
      );

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
   * Resolves project configuration from config or environment.
   */
  private resolveProjectConfig(): ProjectsConfig {
    const token = this.config.token ?? process.env['GITHUB_TOKEN'];
    if (!token) {
      throw new NodeExecutionError(
        'GitHub token not configured. Set token in config or GITHUB_TOKEN env var.',
        'config',
        this.nodeType
      );
    }

    const projectOwner = this.config.projectOwner
      ?? process.env['GITHUB_PROJECT_OWNER']
      ?? this.parseRepoOwner();

    if (!projectOwner) {
      throw new NodeExecutionError(
        'Project owner not configured. Set projectOwner in config or GITHUB_PROJECT_OWNER env var.',
        'config',
        this.nodeType
      );
    }

    const projectNumberStr = process.env['GITHUB_PROJECT_NUMBER'];
    const projectNumber = this.config.projectNumber
      ?? (projectNumberStr ? parseInt(projectNumberStr, 10) : undefined);

    if (!projectNumber || isNaN(projectNumber)) {
      throw new NodeExecutionError(
        'Project number not configured. Set projectNumber in config or GITHUB_PROJECT_NUMBER env var.',
        'config',
        this.nodeType
      );
    }

    const config: ProjectsConfig = {
      token,
      projectOwner,
      projectNumber,
    };

    if (this.config.verbose !== undefined) {
      config.verbose = this.config.verbose;
    }

    return config;
  }

  /**
   * Resolves issue information from config, context, or environment.
   */
  private resolveIssueInfo(state: WorkflowState<TContext>): {
    owner: string;
    repo: string;
    issueNumber: number;
  } {
    // Resolve owner and repo
    const owner = this.config.owner ?? this.parseRepoOwner();
    const repo = this.config.repo ?? this.parseRepoName();

    if (!owner || !repo) {
      throw new NodeExecutionError(
        'Repository not configured. Set owner/repo in config or GITHUB_REPOSITORY env var.',
        'config',
        this.nodeType
      );
    }

    // Resolve issue number
    let issueNumber: number | undefined = this.config.issueNumber;

    if (issueNumber === undefined) {
      // Try to read from context
      const key = this.config.issueNumberKey ?? 'issueNumber';
      const contextValue = (state.context as Record<string, unknown>)[key];

      if (typeof contextValue === 'number') {
        issueNumber = contextValue;
      } else if (typeof contextValue === 'string') {
        issueNumber = parseInt(contextValue, 10);
      }
    }

    if (issueNumber === undefined) {
      // Try environment variable
      const envValue = process.env['ISSUE_NUMBER'] ?? process.env['GITHUB_ISSUE_NUMBER'];
      if (envValue) {
        issueNumber = parseInt(envValue, 10);
      }
    }

    if (issueNumber === undefined || isNaN(issueNumber)) {
      throw new NodeExecutionError(
        'Issue number not found. Set issueNumber in config, context, or ISSUE_NUMBER env var.',
        'config',
        this.nodeType
      );
    }

    return { owner, repo, issueNumber };
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

  /**
   * Parses repository owner from GITHUB_REPOSITORY.
   */
  private parseRepoOwner(): string | undefined {
    const repo = process.env['GITHUB_REPOSITORY'];
    if (!repo) return undefined;
    const [owner] = repo.split('/');
    return owner;
  }

  /**
   * Parses repository name from GITHUB_REPOSITORY.
   */
  private parseRepoName(): string | undefined {
    const repo = process.env['GITHUB_REPOSITORY'];
    if (!repo) return undefined;
    const parts = repo.split('/');
    return parts[1];
  }
}

/**
 * Factory function to create a GitHubProjectNode definition.
 * This is used in atomic.config.ts for declarative node definitions.
 *
 * @example
 * ```typescript
 * nodes.GitHubProjectNode({
 *   status: 'In Progress',
 *   next: 'WORK'
 * })
 *
 * nodes.GitHubProjectNode({
 *   status: 'Done',
 *   next: 'END'
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
