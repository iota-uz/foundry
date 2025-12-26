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
        `[GitHubProjectNode] Updating ${updateArray.length} field(s) on ${owner}/${repo}#${issueNumber}`
      );

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
      const client = await this.getClient(projectConfig, context);

      // Update fields
      const updateResult = await client.updateFields({
        owner,
        repo,
        issueNumber,
        updates: updateArray,
      });

      const duration = Date.now() - startTime;

      const result: GitHubProjectResult = {
        success: updateResult.success,
        updatedFields: updateResult.updatedFields,
        issueNumber,
        repository: `${owner}/${repo}`,
        duration,
        ...(updateResult.error !== undefined && updateResult.error !== '' ? { error: updateResult.error } : {}),
      };

      if (!updateResult.success && throwOnError === true) {
        const failedFields = updateResult.updatedFields
          .filter(f => !f.success)
          .map(f => `${f.field}: ${f.error}`)
          .join('; ');

        throw new NodeExecutionError(
          `Failed to update project fields: ${failedFields}`,
          `${owner}/${repo}#${issueNumber}`,
          this.nodeType,
          undefined,
          { result }
        );
      }

      const updatedFieldNames = result.updatedFields
        .filter(f => f.success)
        .map(f => f.field)
        .join(', ');

      context.logger.info(
        `[GitHubProjectNode] Updated fields: ${updatedFieldNames || 'none'} in ${duration}ms`
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

    this.client = client;
    return client;
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
