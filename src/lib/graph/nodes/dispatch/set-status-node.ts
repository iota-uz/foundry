/**
 * @sys/graph - SetStatusNode Implementation
 *
 * Batch updates status for multiple issues in a GitHub Project.
 * Used for transitioning issues from "Ready" to "In Progress".
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
  ProjectsError,
} from '../../../github-projects';
import type { ResolvedIssue } from '../../../dispatch/types';

/**
 * Result of a single issue status update.
 */
export interface IssueStatusUpdateResult {
  /** Issue number */
  issueNumber: number;

  /** Repository reference */
  repository: string;

  /** Whether the update succeeded */
  success: boolean;

  /** Previous status (if available) */
  previousStatus?: string;

  /** New status */
  newStatus: string;

  /** Error message if update failed */
  error?: string;
}

/**
 * Result of batch status update.
 */
export interface SetStatusResult {
  /** Whether all updates succeeded */
  success: boolean;

  /** Total issues processed */
  totalIssues: number;

  /** Successful updates count */
  successCount: number;

  /** Failed updates count */
  failedCount: number;

  /** Individual update results */
  results: IssueStatusUpdateResult[];

  /** Error message if operation failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Configuration for SetStatusNode.
 */
export interface SetStatusNodeConfig<TContext extends Record<string, unknown>>
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
   * Target status to set (e.g., "In Progress").
   */
  status: string;

  /**
   * Key in context to read issues from.
   * Should contain ResolvedIssue[] array.
   * @default 'readyIssues'
   */
  issuesKey?: string;

  /**
   * Key in context to store the result.
   * @default 'setStatusResult'
   */
  resultKey?: string;

  /**
   * Whether to skip this node if source type is not 'project'.
   * @default true
   */
  skipIfNotProject?: boolean;

  /**
   * Key in context to read source type from.
   * @default 'sourceType'
   */
  sourceTypeKey?: string;

  /**
   * Whether to throw on update failure.
   * @default false (continues with other issues)
   */
  throwOnError?: boolean;

  /**
   * Enable verbose logging.
   * @default false
   */
  verbose?: boolean;
}

/**
 * SetStatusNode - Batch updates issue status in GitHub Projects.
 *
 * @example
 * ```typescript
 * schema.custom('SET_IN_PROGRESS', {
 *   nodeType: 'set-status',
 *   token: process.env.GITHUB_TOKEN!,
 *   projectOwner: 'iota-uz',
 *   projectNumber: 14,
 *   status: 'In Progress',
 *   issuesKey: 'readyIssues',
 *   then: () => 'GENERATE_MATRIX',
 * })
 * ```
 */
export class SetStatusNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, SetStatusNodeConfig<TContext>> {

  public readonly nodeType = 'set-status';

  /** Cached client instance */
  private client: ProjectsClient | null = null;

  constructor(config: SetStatusNodeConfig<TContext>) {
    super({
      ...config,
      issuesKey: config.issuesKey ?? 'readyIssues',
      resultKey: config.resultKey ?? 'setStatusResult',
      skipIfNotProject: config.skipIfNotProject ?? true,
      sourceTypeKey: config.sourceTypeKey ?? 'sourceType',
      throwOnError: config.throwOnError ?? false,
      verbose: config.verbose ?? false,
    });

    this.validateConfig();
  }

  /**
   * Validates required configuration fields.
   */
  private validateConfig(): void {
    const { token, projectOwner, projectNumber, status } = this.config;

    const missing: string[] = [];
    if (!token) missing.push('token');
    if (!projectOwner) missing.push('projectOwner');
    if (!projectNumber) missing.push('projectNumber');
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
   * Executes the batch status update.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      status,
      issuesKey,
      resultKey,
      skipIfNotProject,
      sourceTypeKey,
      throwOnError,
    } = this.config;

    const startTime = Date.now();

    // Check if we should skip this node
    if (skipIfNotProject === true) {
      const sourceType = (state.context as Record<string, unknown>)[sourceTypeKey!] as string | undefined;
      if (sourceType !== 'project') {
        context.logger.info(
          `[SetStatusNode] Skipping - source type is '${sourceType}', not 'project'`
        );

        const result: SetStatusResult = {
          success: true,
          totalIssues: 0,
          successCount: 0,
          failedCount: 0,
          results: [],
          duration: Date.now() - startTime,
        };

        return {
          stateUpdate: {
            context: {
              ...state.context,
              [resultKey!]: result,
            } as TContext,
          },
          metadata: {
            skipped: true,
            reason: 'source type is not project',
          },
        };
      }
    }

    try {
      // Get issues from context
      const issues = (state.context as Record<string, unknown>)[issuesKey!] as ResolvedIssue[] | undefined;

      if (!issues || !Array.isArray(issues)) {
        context.logger.warn(
          `[SetStatusNode] No issues found at key '${issuesKey}', skipping`
        );

        const result: SetStatusResult = {
          success: true,
          totalIssues: 0,
          successCount: 0,
          failedCount: 0,
          results: [],
          duration: Date.now() - startTime,
        };

        return {
          stateUpdate: {
            context: {
              ...state.context,
              [resultKey!]: result,
            } as TContext,
          },
          metadata: { skipped: true, reason: 'no issues' },
        };
      }

      context.logger.info(
        `[SetStatusNode] Updating ${issues.length} issue(s) to status "${status}"`
      );

      // Get or create client
      const client = await this.getClient(context);

      // Update each issue
      const results: IssueStatusUpdateResult[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (const resolved of issues) {
        const { issue } = resolved;
        const repository = `${issue.owner}/${issue.repo}`;

        try {
          const updateResult = await client.updateStatus({
            owner: issue.owner,
            repo: issue.repo,
            issueNumber: issue.number,
            status,
          });

          if (updateResult.success) {
            successCount++;
            const successResult: IssueStatusUpdateResult = {
              issueNumber: issue.number,
              repository,
              success: true,
              newStatus: updateResult.newStatus,
            };
            if (updateResult.previousStatus !== undefined) {
              successResult.previousStatus = updateResult.previousStatus;
            }
            results.push(successResult);

            context.logger.info(
              `[SetStatusNode] Updated #${issue.number} to "${status}"`
            );
          } else {
            failedCount++;
            const failResult: IssueStatusUpdateResult = {
              issueNumber: issue.number,
              repository,
              success: false,
              newStatus: status,
            };
            if (updateResult.error !== undefined) {
              failResult.error = updateResult.error;
            }
            results.push(failResult);

            context.logger.warn(
              `[SetStatusNode] Failed to update #${issue.number}: ${updateResult.error}`
            );
          }
        } catch (err) {
          failedCount++;
          const errorMessage = err instanceof Error ? err.message : String(err);

          results.push({
            issueNumber: issue.number,
            repository,
            success: false,
            newStatus: status,
            error: errorMessage,
          });

          context.logger.warn(
            `[SetStatusNode] Error updating #${issue.number}: ${errorMessage}`
          );
        }
      }

      const duration = Date.now() - startTime;
      const allSucceeded = failedCount === 0;

      const result: SetStatusResult = {
        success: allSucceeded,
        totalIssues: issues.length,
        successCount,
        failedCount,
        results,
        duration,
        ...(allSucceeded ? {} : { error: `${failedCount} update(s) failed` }),
      };

      context.logger.info(
        `[SetStatusNode] Completed: ${successCount} succeeded, ${failedCount} failed in ${duration}ms`
      );

      if (!allSucceeded && throwOnError === true) {
        throw new NodeExecutionError(
          `Failed to update ${failedCount} issue(s)`,
          'batch-update',
          this.nodeType,
          undefined,
          { result }
        );
      }

      return {
        stateUpdate: {
          context: {
            ...state.context,
            [resultKey!]: result,
          } as TContext,
        },
        metadata: {
          duration,
          totalIssues: issues.length,
          successCount,
          failedCount,
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
        `Status update failed: ${err.message}`,
        'update',
        this.nodeType,
        err,
        { duration }
      );
    }
  }

  /**
   * Gets or creates a validated ProjectsClient.
   */
  private async getClient(context: GraphContext): Promise<ProjectsClient> {
    if (this.client) {
      return this.client;
    }

    const { token, projectOwner, projectNumber, verbose } = this.config;

    const projectConfig: ProjectsConfig = {
      token,
      projectOwner,
      projectNumber,
      ...(verbose === true ? { verbose: true } : {}),
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

    if (validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        context.logger.warn(`[SetStatusNode] Warning: ${warning}`);
      }
    }

    this.client = client;
    return client;
  }
}

/**
 * Factory function to create a SetStatusNode definition.
 */
export function createSetStatusNode<TContext extends Record<string, unknown>>(
  config: Omit<SetStatusNodeConfig<TContext>, 'next'> & {
    next: (state: WorkflowState<TContext>) => string;
  }
): SetStatusNodeConfig<TContext> {
  return config;
}
