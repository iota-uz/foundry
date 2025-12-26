/**
 * @sys/graph - GitHubProjectNode Implementation
 *
 * Updates fields in GitHub Projects V2 via GraphQL API.
 * Supports updating any field type: status, text, number, date.
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext, Transition } from '../../types';
import {
  ProjectsClient,
  type ProjectsConfig,
  type FieldUpdate,
  type FieldUpdateResult,
  ProjectsError,
} from '../../../github-projects';
import {
  IssuesClient,
  type IssuesConfig,
} from '../../../github-issues';

/**
 * Result of a GitHub Project field update.
 */
export interface GitHubProjectResult {
  /** Whether the update succeeded */
  success: boolean;

  /** Individual field update results */
  updatedFields: FieldUpdateResult[];

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
 * Supports updating any field in the project, not just status.
 */
export interface GitHubProjectNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * GitHub personal access token with `project` scope.
   */
  token: string;

  /**
   * Project owner (user or organization login).
   */
  projectOwner: string;

  /**
   * Project number (visible in project URL).
   */
  projectNumber: number;

  /**
   * Repository owner.
   */
  owner: string;

  /**
   * Repository name.
   */
  repo: string;

  /**
   * Field updates to apply.
   * Can be a single update or an array of updates.
   *
   * @example
   * ```typescript
   * // Single status update
   * updates: { type: 'single_select', field: 'Status', value: 'Done' }
   *
   * // Multiple field updates
   * updates: [
   *   { type: 'single_select', field: 'Status', value: 'In Progress' },
   *   { type: 'single_select', field: 'Priority', value: 'High' },
   *   { type: 'text', field: 'Notes', value: 'Working on it' },
   * ]
   * ```
   */
  updates: FieldUpdate | FieldUpdate[];

  /**
   * Issue number to update.
   * Either provide this directly or use `issueNumberKey` to read from context.
   */
  issueNumber?: number;

  /**
   * Key in workflow context to read issue number from.
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
 * GitHubProjectNode - Updates fields in GitHub Projects.
 *
 * @example
 * ```typescript
 * // Update status
 * nodes.GitHubProjectNode({
 *   token: process.env.GITHUB_TOKEN!,
 *   projectOwner: 'myorg',
 *   projectNumber: 1,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   updates: { type: 'single_select', field: 'Status', value: 'Done' },
 *   next: 'END',
 * })
 *
 * // Update multiple fields
 * nodes.GitHubProjectNode({
 *   token: process.env.GITHUB_TOKEN!,
 *   projectOwner: 'myorg',
 *   projectNumber: 1,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   updates: [
 *     { type: 'single_select', field: 'Status', value: 'In Progress' },
 *     { type: 'text', field: 'Notes', value: 'Started work' },
 *   ],
 *   next: 'WORK',
 * })
 * ```
 */
export class GitHubProjectNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, GitHubProjectNodeConfig<TContext>> {

  public readonly nodeType = 'github-project';

  /** Cached project client instance */
  private projectClient: ProjectsClient | null = null;

  /** Cached issues client instance */
  private issuesClient: IssuesClient | null = null;

  constructor(config: GitHubProjectNodeConfig<TContext>) {
    super({
      ...config,
      throwOnError: config.throwOnError ?? true,
      resultKey: config.resultKey ?? 'lastProjectResult',
      issueNumberKey: config.issueNumberKey ?? 'issueNumber',
      verbose: config.verbose ?? false,
    });

    this.validateConfig();
  }

  /**
   * Validates required configuration fields.
   */
  private validateConfig(): void {
    const { token, projectOwner, projectNumber, owner, repo, updates } = this.config;

    const missing: string[] = [];
    if (token === undefined || token === '') missing.push('token');
    if (projectOwner === undefined || projectOwner === '') missing.push('projectOwner');
    if (projectNumber === undefined || projectNumber === 0) missing.push('projectNumber');
    if (owner === undefined || owner === '') missing.push('owner');
    if (repo === undefined || repo === '') missing.push('repo');
    if (updates === undefined) missing.push('updates');

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
   * Executes the field updates.
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
      updates,
      throwOnError,
      resultKey,
      verbose,
    } = this.config;

    const startTime = Date.now();

    try {
      const issueNumber = this.resolveIssueNumber(state);
      const updateArray = Array.isArray(updates) ? updates : [updates];

      context.logger.info(
        `[GitHubProjectNode] Processing ${updateArray.length} update(s) on ${owner}/${repo}#${issueNumber}`
      );

      // Separate project field updates from issue operations
      const issueOperationTypes = new Set(['add_labels', 'remove_labels', 'add_assignees', 'remove_assignees']);
      const projectUpdates = updateArray.filter(u => !issueOperationTypes.has(u.type));
      const issueOperations = updateArray.filter(u => issueOperationTypes.has(u.type));

      const allResults: FieldUpdateResult[] = [];

      // Execute project field updates
      if (projectUpdates.length > 0) {
        // Create project config
        const projectConfig: ProjectsConfig = {
          token,
          projectOwner,
          projectNumber,
        };

        if (verbose === true) {
          projectConfig.verbose = true;
        }

        // Create and validate client
        const projectClient = await this.getProjectClient(projectConfig, context);

        // Update project fields
        const updateResult = await projectClient.updateFields({
          owner,
          repo,
          issueNumber,
          updates: projectUpdates,
        });

        allResults.push(...updateResult.updatedFields);
      }

      // Execute issue operations
      if (issueOperations.length > 0) {
        const issuesConfig: IssuesConfig = {
          token,
        };

        if (verbose === true) {
          issuesConfig.verbose = true;
        }

        const issuesClient = this.getIssuesClient(issuesConfig);

        const issueResults = await this.executeIssueOperations(
          issuesClient,
          owner,
          repo,
          issueNumber,
          issueOperations
        );

        allResults.push(...issueResults);
      }

      const duration = Date.now() - startTime;

      const allSucceeded = allResults.every(r => r.success);

      const result: GitHubProjectResult = {
        success: allSucceeded,
        updatedFields: allResults,
        issueNumber,
        repository: `${owner}/${repo}`,
        duration,
        ...(!allSucceeded ? { error: `${allResults.filter(r => !r.success).length} update(s) failed` } : {}),
      };

      if (!allSucceeded && throwOnError === true) {
        const failed = allResults
          .filter(f => !f.success)
          .map(f => `${f.field}: ${f.error}`)
          .join('; ');

        throw new NodeExecutionError(
          `Failed to apply updates: ${failed}`,
          `${owner}/${repo}#${issueNumber}`,
          this.nodeType,
          undefined,
          { result }
        );
      }

      const successfulUpdates = result.updatedFields
        .filter(f => f.success)
        .map(f => f.field)
        .join(', ');

      context.logger.info(
        `[GitHubProjectNode] Applied updates: ${successfulUpdates || 'none'} in ${duration}ms`
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
          updatedFields: result.updatedFields,
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
          'projects',
          this.nodeType,
          err,
          { code: err.code, details: err.details }
        );
      }

      throw new NodeExecutionError(
        `Field update failed: ${err.message}`,
        'update',
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
    if (this.config.issueNumber !== undefined) {
      return this.config.issueNumber;
    }

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
  private async getProjectClient(
    config: ProjectsConfig,
    context: GraphContext
  ): Promise<ProjectsClient> {
    if (this.projectClient) {
      return this.projectClient;
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

    this.projectClient = client;
    return client;
  }

  /**
   * Gets or creates an IssuesClient.
   */
  private getIssuesClient(config: IssuesConfig): IssuesClient {
    if (this.issuesClient) {
      return this.issuesClient;
    }

    this.issuesClient = new IssuesClient(config);
    return this.issuesClient;
  }

  /**
   * Execute issue operations (labels, assignees).
   */
  private async executeIssueOperations(
    client: IssuesClient,
    owner: string,
    repo: string,
    issueNumber: number,
    operations: FieldUpdate[]
  ): Promise<FieldUpdateResult[]> {
    const results: FieldUpdateResult[] = [];

    for (const operation of operations) {
      switch (operation.type) {
        case 'add_labels': {
          const result = await client.addLabels(owner, repo, issueNumber, operation.labels);
          results.push({
            field: 'labels',
            success: result.success,
            newValue: `+${operation.labels.join(', ')}`,
            ...(result.error !== undefined && { error: result.error }),
          });
          break;
        }

        case 'remove_labels': {
          const result = await client.removeLabels(owner, repo, issueNumber, operation.labels);
          results.push({
            field: 'labels',
            success: result.success,
            newValue: `-${operation.labels.join(', ')}`,
            ...(result.error !== undefined && { error: result.error }),
          });
          break;
        }

        case 'add_assignees': {
          const result = await client.addAssignees(owner, repo, issueNumber, operation.assignees);
          results.push({
            field: 'assignees',
            success: result.success,
            newValue: `+${operation.assignees.join(', ')}`,
            ...(result.error !== undefined && { error: result.error }),
          });
          break;
        }

        case 'remove_assignees': {
          const result = await client.removeAssignees(owner, repo, issueNumber, operation.assignees);
          results.push({
            field: 'assignees',
            success: result.success,
            newValue: `-${operation.assignees.join(', ')}`,
            ...(result.error !== undefined && { error: result.error }),
          });
          break;
        }
      }
    }

    return results;
  }
}

/**
 * Factory function to create a GitHubProjectNode definition.
 */
export function createGitHubProjectNode<TContext extends Record<string, unknown>>(
  config: Omit<GitHubProjectNodeConfig<TContext>, 'next'> & {
    next: Transition<TContext>;
  }
): GitHubProjectNodeConfig<TContext> {
  return config;
}
