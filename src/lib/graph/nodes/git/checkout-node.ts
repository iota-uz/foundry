/**
 * @sys/graph - GitCheckoutNode Implementation
 *
 * Clones a GitHub repository for workflow execution.
 * Credentials are resolved from the automation context (issue metadata → project).
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext } from '../../types';
import { executeCommand } from '../utils/command-utils';
import {
  resolveGitCredentials,
  type GitCheckoutContext,
} from './credential-resolver';

/**
 * Result of a git checkout operation.
 */
export interface GitCheckoutResult {
  /** Working directory containing the cloned repository */
  workDir: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Git ref that was checked out */
  ref: string;
  /** Commit SHA of the checked out revision */
  sha: string;
}

/**
 * Configuration for GitCheckoutNode.
 */
export interface GitCheckoutNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * Use repository info from issue context (issueMetadataId in context).
   * When true, owner/repo are resolved from the issue that triggered the workflow.
   * Default: true
   */
  useIssueContext?: boolean;

  /**
   * Manual repository owner override.
   * Used when useIssueContext is false or as a fallback.
   */
  owner?: string;

  /**
   * Manual repository name override.
   * Used when useIssueContext is false or as a fallback.
   */
  repo?: string;

  /**
   * Git ref to checkout (branch, tag, or commit SHA).
   * Default: 'main'
   */
  ref?: string;

  /**
   * Clone depth for shallow clone.
   * Default: 1 (shallow clone)
   * Set to 0 for full clone.
   */
  depth?: number;

  /**
   * Skip checkout if directory already exists.
   * Default: true
   */
  skipIfExists?: boolean;

  /**
   * Base directory for checkouts.
   * Default: '/tmp/foundry-checkout-{executionId}' (in-process)
   *          '/workspace' (container)
   */
  baseDir?: string;

  /**
   * Key in context to store the checkout result.
   * Default: 'checkout'
   */
  resultKey?: string;
}

/**
 * GitCheckoutNode - Clones a GitHub repository.
 *
 * Features:
 * - Resolves credentials from automation context
 * - Supports shallow and full clones
 * - Sets workDir in context for subsequent nodes
 * - Handles existing directories gracefully
 *
 * @example
 * ```typescript
 * // From issue context (most common)
 * const checkout = new GitCheckoutNodeRuntime<MyContext>({
 *   useIssueContext: true,
 *   ref: 'main',
 *   next: 'IMPLEMENT'
 * });
 *
 * // Manual override
 * const checkout = new GitCheckoutNodeRuntime<MyContext>({
 *   useIssueContext: false,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   ref: 'feature-branch',
 *   next: 'BUILD'
 * });
 * ```
 */
export class GitCheckoutNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, GitCheckoutNodeConfig<TContext>>
{
  public readonly nodeType = 'git-checkout';

  constructor(config: GitCheckoutNodeConfig<TContext>) {
    super({
      ...config,
      useIssueContext: config.useIssueContext ?? true,
      ref: config.ref ?? 'main',
      depth: config.depth ?? 1,
      skipIfExists: config.skipIfExists ?? true,
      resultKey: config.resultKey ?? 'checkout',
    });
  }

  /**
   * Executes the git checkout operation.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      useIssueContext,
      owner: ownerOverride,
      repo: repoOverride,
      ref,
      depth,
      skipIfExists,
      baseDir,
      resultKey,
    } = this.config;

    context.logger.info('[GitCheckoutNode] Starting checkout');

    // Step 1: Resolve credentials
    let gitContext: GitCheckoutContext;
    try {
      // Build options object, only adding defined properties
      const resolveOptions: { issueMetadataId?: string; owner?: string; repo?: string } = {};

      if (useIssueContext) {
        const issueMetaId = (state.context as Record<string, unknown>).issueMetadataId;
        if (typeof issueMetaId === 'string') {
          resolveOptions.issueMetadataId = issueMetaId;
        }
      }

      if (ownerOverride !== undefined) {
        resolveOptions.owner = ownerOverride;
      }

      if (repoOverride !== undefined) {
        resolveOptions.repo = repoOverride;
      }

      gitContext = await resolveGitCredentials(resolveOptions);
    } catch (error) {
      throw new NodeExecutionError(
        `Failed to resolve git credentials: ${(error as Error).message}`,
        'resolve credentials',
        this.nodeType,
        error as Error
      );
    }

    const { owner, repo, token } = gitContext;
    context.logger.info(`[GitCheckoutNode] Repository: ${owner}/${repo}`);

    // Step 2: Determine working directory
    const executionId = (state.context as Record<string, unknown>).executionId as string | undefined;
    const defaultBase = process.env.FOUNDRY_WORKING_DIR
      ?? `/tmp/foundry-checkout-${executionId ?? 'unknown'}`;
    const base = baseDir ?? defaultBase;
    const workDir = `${base}/${owner}-${repo}`;

    context.logger.info(`[GitCheckoutNode] Work directory: ${workDir}`);

    // Step 3: Check if already exists
    if (skipIfExists) {
      try {
        const { success } = await executeCommand(['test', '-d', workDir]);
        if (success) {
          context.logger.info('[GitCheckoutNode] Directory exists, skipping clone');

          // Get current SHA
          const shaResult = await executeCommand(
            ['git', 'rev-parse', 'HEAD'],
            { cwd: workDir }
          );

          const checkoutResult: GitCheckoutResult = {
            workDir,
            owner,
            repo,
            ref: ref as string,
            sha: shaResult.stdout.trim(),
          };

          return {
            stateUpdate: {
              context: {
                ...state.context,
                [resultKey as string]: checkoutResult,
                workDir,
              } as TContext,
            },
            metadata: {
              skipped: true,
              reason: 'directory_exists',
            },
          };
        }
      } catch {
        // Directory doesn't exist, proceed with clone
      }
    }

    // Step 4: Create base directory
    try {
      await executeCommand(['mkdir', '-p', base]);
    } catch (error) {
      throw new NodeExecutionError(
        `Failed to create base directory: ${(error as Error).message}`,
        `mkdir -p ${base}`,
        this.nodeType,
        error as Error
      );
    }

    // Step 5: Clone repository
    const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
    const cloneArgs = ['git', 'clone'];

    if ((depth as number) > 0) {
      cloneArgs.push('--depth', String(depth));
    }

    if (ref && ref !== 'main' && ref !== 'master') {
      cloneArgs.push('--branch', ref as string);
    }

    cloneArgs.push(cloneUrl, workDir);

    context.logger.info(
      `[GitCheckoutNode] Cloning: git clone${(depth as number) > 0 ? ` --depth ${depth}` : ''} <url> ${workDir}`
    );

    try {
      await executeCommand(cloneArgs, { timeout: 120000 }); // 2 minute timeout
    } catch (error) {
      throw new NodeExecutionError(
        `Git clone failed: ${(error as Error).message}`,
        `git clone ${owner}/${repo}`,
        this.nodeType,
        error as Error,
        { owner, repo, ref }
      );
    }

    // Step 6: Checkout specific ref if needed (for commits/tags after shallow clone)
    if (ref && ref !== 'main' && ref !== 'master' && (depth as number) > 0) {
      try {
        await executeCommand(['git', 'checkout', ref as string], { cwd: workDir });
      } catch {
        // Branch was likely already checked out during clone
      }
    }

    // Step 7: Get commit SHA
    let sha: string;
    try {
      const shaResult = await executeCommand(
        ['git', 'rev-parse', 'HEAD'],
        { cwd: workDir }
      );
      sha = shaResult.stdout.trim();
    } catch (error) {
      throw new NodeExecutionError(
        `Failed to get commit SHA: ${(error as Error).message}`,
        'git rev-parse HEAD',
        this.nodeType,
        error as Error
      );
    }

    context.logger.info(`[GitCheckoutNode] Checked out ${ref} at ${sha.slice(0, 8)}`);

    // Build result
    const checkoutResult: GitCheckoutResult = {
      workDir,
      owner,
      repo,
      ref: ref as string,
      sha,
    };

    return {
      stateUpdate: {
        context: {
          ...state.context,
          [resultKey as string]: checkoutResult,
          workDir,
        } as TContext,
      },
      metadata: {
        owner,
        repo,
        ref,
        sha,
        workDir,
      },
    };
  }
}
