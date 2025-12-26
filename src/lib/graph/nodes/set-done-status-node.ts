/**
 * SetDoneStatusNode - Updates project status to "Done" for a single issue
 *
 * Uses ProjectsClient for type-safe GraphQL operations instead of gh CLI.
 * Designed for the issue-processor workflow to mark issues complete.
 */

import { BaseNode, type BaseNodeConfig, type NodeExecutionResult } from './base';
import type { WorkflowState, GraphContext } from '../types';
import { ProjectsClient, type ProjectsConfig } from '../../github-projects';

/**
 * Configuration for SetDoneStatusNode.
 */
export interface SetDoneStatusNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * GitHub personal access token with `project` scope.
   * Read from context if not provided.
   */
  token?: string;

  /**
   * Key in context to read token from.
   * @default 'githubToken'
   */
  tokenKey?: string;

  /**
   * Key in context to read project owner from.
   * @default 'projectOwner'
   */
  projectOwnerKey?: string;

  /**
   * Key in context to read project number from.
   * @default 'projectNumber'
   */
  projectNumberKey?: string;

  /**
   * Key in context to read done status from.
   * @default 'doneStatus'
   */
  doneStatusKey?: string;

  /**
   * Default status to set if not in context.
   * @default 'Done'
   */
  defaultStatus?: string;

  /**
   * Key in context to read repository from (owner/repo format).
   * @default 'repository'
   */
  repositoryKey?: string;

  /**
   * Key in context to read issue number from.
   * @default 'issueNumber'
   */
  issueNumberKey?: string;

  /**
   * Enable verbose logging.
   * @default false
   */
  verbose?: boolean;
}

/**
 * Result of the status update operation.
 */
export interface SetDoneStatusResult {
  /** Whether the update succeeded */
  success: boolean;
  /** Previous status if available */
  previousStatus?: string;
  /** New status */
  newStatus: string;
  /** Error message if failed */
  error?: string;
  /** Whether the operation was skipped */
  skipped: boolean;
  /** Reason for skipping */
  skipReason?: string;
}

/**
 * SetDoneStatusNode - Updates a single issue's project status to "Done".
 *
 * This node reads configuration from the workflow context and uses
 * ProjectsClient to update the status via GitHub's GraphQL API.
 */
export class SetDoneStatusNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, SetDoneStatusNodeConfig<TContext>> {

  public readonly nodeType = 'set-done-status';

  constructor(config: SetDoneStatusNodeConfig<TContext>) {
    super({
      ...config,
      tokenKey: config.tokenKey ?? 'githubToken',
      projectOwnerKey: config.projectOwnerKey ?? 'projectOwner',
      projectNumberKey: config.projectNumberKey ?? 'projectNumber',
      doneStatusKey: config.doneStatusKey ?? 'doneStatus',
      defaultStatus: config.defaultStatus ?? 'Done',
      repositoryKey: config.repositoryKey ?? 'repository',
      issueNumberKey: config.issueNumberKey ?? 'issueNumber',
      verbose: config.verbose ?? false,
    });
  }

  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      token: configToken,
      tokenKey,
      projectOwnerKey,
      projectNumberKey,
      doneStatusKey,
      defaultStatus,
      repositoryKey,
      issueNumberKey,
      verbose,
    } = this.config;

    const ctx = state.context as Record<string, unknown>;

    // Get configuration from context
    const token = configToken ?? (ctx[tokenKey!] as string | undefined) ?? process.env['GITHUB_TOKEN'];
    const projectOwner = ctx[projectOwnerKey!] as string | undefined;
    const projectNumber = ctx[projectNumberKey!] as number | undefined;
    const doneStatus = (ctx[doneStatusKey!] as string | undefined) ?? defaultStatus!;
    const repository = ctx[repositoryKey!] as string | undefined;
    const issueNumber = ctx[issueNumberKey!] as number | undefined;

    // Check if we have required configuration
    if ((projectOwner === undefined || projectOwner === '') || (projectNumber === undefined || projectNumber === 0)) {
      const result: SetDoneStatusResult = {
        success: true,
        newStatus: doneStatus,
        skipped: true,
        skipReason: 'No project configuration (projectOwner or projectNumber missing)',
      };

      context.logger.info('[SetDoneStatusNode] Skipping - no project configuration');

      return {
        stateUpdate: {
          context: {
            ...state.context,
            setDoneStatusResult: result,
          } as TContext,
        },
        metadata: { skipped: true },
      };
    }

    if (token === undefined || token === '') {
      const result: SetDoneStatusResult = {
        success: false,
        newStatus: doneStatus,
        skipped: false,
        error: 'No GitHub token available',
      };

      context.logger.warn('[SetDoneStatusNode] No GitHub token available');

      return {
        stateUpdate: {
          context: {
            ...state.context,
            setDoneStatusResult: result,
          } as TContext,
        },
        metadata: { error: 'No token' },
      };
    }

    if ((repository === undefined || repository === null || repository === '') || (issueNumber === undefined || issueNumber === null || issueNumber === 0)) {
      const result: SetDoneStatusResult = {
        success: true,
        newStatus: doneStatus,
        skipped: true,
        skipReason: 'No repository or issue number in context',
      };

      context.logger.info('[SetDoneStatusNode] Skipping - no repository or issue number');

      return {
        stateUpdate: {
          context: {
            ...state.context,
            setDoneStatusResult: result,
          } as TContext,
        },
        metadata: { skipped: true },
      };
    }

    // Parse owner/repo from repository string
    const [repoOwner, repoName] = repository.split('/');
    if ((repoOwner === undefined || repoOwner === null || repoOwner === '') || (repoName === undefined || repoName === null || repoName === '')) {
      const result: SetDoneStatusResult = {
        success: false,
        newStatus: doneStatus,
        skipped: false,
        error: `Invalid repository format: ${repository}`,
      };

      return {
        stateUpdate: {
          context: {
            ...state.context,
            setDoneStatusResult: result,
          } as TContext,
        },
        metadata: { error: 'Invalid repository format' },
      };
    }

    context.logger.info(
      `[SetDoneStatusNode] Updating issue #${issueNumber} to status "${doneStatus}"`
    );

    try {
      // Create ProjectsClient
      const projectConfig: ProjectsConfig = {
        token,
        projectOwner,
        projectNumber,
      };
      if (verbose === true) {
        projectConfig.verbose = true;
      }

      const client = new ProjectsClient(projectConfig);

      // Validate project configuration
      const validation = await client.validate();
      if (!validation.valid) {
        const result: SetDoneStatusResult = {
          success: false,
          newStatus: doneStatus,
          skipped: false,
          error: `Project validation failed: ${validation.errors.join(', ')}`,
        };

        context.logger.warn(`[SetDoneStatusNode] Validation failed: ${validation.errors.join(', ')}`);

        return {
          stateUpdate: {
            context: {
              ...state.context,
              setDoneStatusResult: result,
            } as TContext,
          },
          metadata: { error: 'Validation failed' },
        };
      }

      // Update status
      const updateResult = await client.updateStatus({
        owner: repoOwner,
        repo: repoName,
        issueNumber,
        status: doneStatus,
      });

      const result: SetDoneStatusResult = {
        success: updateResult.success,
        newStatus: updateResult.newStatus,
        skipped: false,
      };

      if (updateResult.previousStatus !== undefined && updateResult.previousStatus !== '') {
        result.previousStatus = updateResult.previousStatus;
      }
      if (updateResult.error !== undefined && updateResult.error !== '') {
        result.error = updateResult.error;
      }

      if (updateResult.success) {
        context.logger.info(
          `[SetDoneStatusNode] Successfully updated issue #${issueNumber} to "${doneStatus}"`
        );
      } else {
        context.logger.warn(
          `[SetDoneStatusNode] Failed to update issue #${issueNumber}: ${updateResult.error}`
        );
      }

      return {
        stateUpdate: {
          context: {
            ...state.context,
            setDoneStatusResult: result,
          } as TContext,
        },
        metadata: {
          success: updateResult.success,
          previousStatus: updateResult.previousStatus,
          newStatus: updateResult.newStatus,
        },
      };
    } catch (error) {
      const err = error as Error;
      const result: SetDoneStatusResult = {
        success: false,
        newStatus: doneStatus,
        skipped: false,
        error: err.message,
      };

      context.logger.error(`[SetDoneStatusNode] Error: ${err.message}`);

      return {
        stateUpdate: {
          context: {
            ...state.context,
            setDoneStatusResult: result,
          } as TContext,
        },
        metadata: { error: err.message },
      };
    }
  }
}
