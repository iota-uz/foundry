/**
 * @sys/graph - GithubCommentsNode Implementation
 *
 * Creates and updates GitHub issue/PR comments.
 * Supports marker-based upsert for progress tracking.
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext, Transition } from '../../types';

/**
 * Comment action types.
 */
export type CommentAction =
  | { action: 'create'; body: string }
  | { action: 'update'; commentId: number; body: string }
  | { action: 'append'; commentId: number; content: string }
  | { action: 'find_or_create'; marker: string; body: string }
  | { action: 'upsert'; marker: string; body: string };

/**
 * Result of a comment operation.
 */
export interface CommentResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Comment ID */
  commentId: number;

  /** Comment permalink URL */
  url: string;

  /** Whether a new comment was created */
  created: boolean;

  /** Error message if failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Configuration for GithubCommentsNode.
 */
export interface GithubCommentsNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * GitHub personal access token.
   */
  token: string;

  /**
   * Repository owner.
   */
  owner: string;

  /**
   * Repository name.
   */
  repo: string;

  /**
   * Issue or PR number.
   */
  issueNumber?: number;

  /**
   * Key in context to read issue number from.
   * @default 'issueNumber'
   */
  issueNumberKey?: string;

  /**
   * Comment action to perform.
   * Can be a static action or a function that returns the action based on state.
   */
  comment: CommentAction | ((state: WorkflowState<TContext>) => CommentAction);

  /**
   * Whether to throw on failure.
   * @default true
   */
  throwOnError?: boolean;

  /**
   * Key in context to store the result.
   * @default 'lastCommentResult'
   */
  resultKey?: string;
}

/**
 * GithubCommentsNode - Works with GitHub issue/PR comments.
 *
 * Features:
 * - Create new comments
 * - Update existing comments
 * - Append to comments
 * - Marker-based find/create and upsert
 *
 * @example
 * ```typescript
 * // Create a progress comment with upsert
 * nodes.GithubCommentsNode({
 *   token: process.env.GITHUB_TOKEN!,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   issueNumberKey: 'issueNumber',
 *   comment: {
 *     action: 'upsert',
 *     marker: 'workflow-status',
 *     body: '## Status\n- [x] Build\n- [ ] Test',
 *   },
 *   next: 'TEST',
 * })
 * ```
 */
export class GithubCommentsNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, GithubCommentsNodeConfig<TContext>> {

  public readonly nodeType = 'github-comments';

  constructor(config: GithubCommentsNodeConfig<TContext>) {
    super({
      ...config,
      issueNumberKey: config.issueNumberKey ?? 'issueNumber',
      throwOnError: config.throwOnError ?? true,
      resultKey: config.resultKey ?? 'lastCommentResult',
    });

    // Validate required fields
    if (!config.token) {
      throw new NodeExecutionError('token is required', 'config', this.nodeType);
    }
    if (!config.owner) {
      throw new NodeExecutionError('owner is required', 'config', this.nodeType);
    }
    if (!config.repo) {
      throw new NodeExecutionError('repo is required', 'config', this.nodeType);
    }
  }

  /**
   * Executes the comment operation.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      token,
      owner,
      repo,
      comment,
      throwOnError,
      resultKey,
    } = this.config;

    const startTime = Date.now();

    try {
      const issueNumber = this.resolveIssueNumber(state);
      const action = typeof comment === 'function' ? comment(state) : comment;

      context.logger.info(
        `[GithubCommentsNode] ${action.action} on ${owner}/${repo}#${issueNumber}`
      );

      let result: CommentResult;

      switch (action.action) {
        case 'create':
          result = await this.createComment(token, owner, repo, issueNumber, action.body, startTime);
          break;

        case 'update':
          result = await this.updateComment(token, owner, repo, action.commentId, action.body, startTime);
          break;

        case 'append':
          result = await this.appendToComment(token, owner, repo, action.commentId, action.content, startTime);
          break;

        case 'find_or_create':
        case 'upsert':
          result = await this.upsertComment(
            token, owner, repo, issueNumber,
            action.marker, action.body, startTime
          );
          break;

        default:
          throw new NodeExecutionError(
            `Unknown comment action: ${(action as CommentAction).action}`,
            'action',
            this.nodeType
          );
      }

      if (!result.success && throwOnError === true) {
        throw new NodeExecutionError(
          `Comment operation failed: ${result.error}`,
          `${owner}/${repo}#${issueNumber}`,
          this.nodeType
        );
      }

      context.logger.info(
        `[GithubCommentsNode] ${result.created ? 'Created' : 'Updated'} comment #${result.commentId}`
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
          commentId: result.commentId,
          created: result.created,
          duration: result.duration,
        },
      };
    } catch (error) {
      const err = error as Error;

      if (err instanceof NodeExecutionError) {
        throw err;
      }

      const duration = Date.now() - startTime;
      throw new NodeExecutionError(
        `Comment operation failed: ${err.message}`,
        `${owner}/${repo}`,
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
   * Creates a new comment.
   */
  private async createComment(
    token: string,
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
    startTime: number
  ): Promise<CommentResult> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        commentId: 0,
        url: '',
        created: false,
        error: `GitHub API error: ${response.status} - ${error}`,
        duration,
      };
    }

    const data = await response.json() as { id: number; html_url: string };

    return {
      success: true,
      commentId: data.id,
      url: data.html_url,
      created: true,
      duration,
    };
  }

  /**
   * Updates an existing comment.
   */
  private async updateComment(
    token: string,
    owner: string,
    repo: string,
    commentId: number,
    body: string,
    startTime: number
  ): Promise<CommentResult> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        commentId,
        url: '',
        created: false,
        error: `GitHub API error: ${response.status} - ${error}`,
        duration,
      };
    }

    const data = await response.json() as { id: number; html_url: string };

    return {
      success: true,
      commentId: data.id,
      url: data.html_url,
      created: false,
      duration,
    };
  }

  /**
   * Appends content to an existing comment.
   */
  private async appendToComment(
    token: string,
    owner: string,
    repo: string,
    commentId: number,
    content: string,
    startTime: number
  ): Promise<CommentResult> {
    // First, get the existing comment
    const getResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!getResponse.ok) {
      const duration = Date.now() - startTime;
      const error = await getResponse.text();
      return {
        success: false,
        commentId,
        url: '',
        created: false,
        error: `Failed to fetch comment: ${getResponse.status} - ${error}`,
        duration,
      };
    }

    const existing = await getResponse.json() as { body: string };
    const newBody = `${existing.body}\n\n${content}`;

    return this.updateComment(token, owner, repo, commentId, newBody, startTime);
  }

  /**
   * Finds a comment by marker or creates a new one.
   * Marker is embedded as an HTML comment: <!-- marker:xxx -->
   */
  private async upsertComment(
    token: string,
    owner: string,
    repo: string,
    issueNumber: number,
    marker: string,
    body: string,
    startTime: number
  ): Promise<CommentResult> {
    const markerTag = `<!-- marker:${marker} -->`;
    const bodyWithMarker = `${markerTag}\n${body}`;

    // Fetch existing comments
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const duration = Date.now() - startTime;
      const error = await response.text();
      return {
        success: false,
        commentId: 0,
        url: '',
        created: false,
        error: `Failed to fetch comments: ${response.status} - ${error}`,
        duration,
      };
    }

    const comments = await response.json() as Array<{ id: number; body: string; html_url: string }>;

    // Find comment with marker
    const existingComment = comments.find(c => c.body.includes(markerTag));

    if (existingComment) {
      // Update existing comment
      return this.updateComment(token, owner, repo, existingComment.id, bodyWithMarker, startTime);
    } else {
      // Create new comment
      return this.createComment(token, owner, repo, issueNumber, bodyWithMarker, startTime);
    }
  }
}

/**
 * Factory function to create a GithubCommentsNode definition.
 */
export function createGithubCommentsNode<TContext extends Record<string, unknown>>(
  config: Omit<GithubCommentsNodeConfig<TContext>, 'next'> & {
    next: Transition<TContext>;
  }
): GithubCommentsNodeConfig<TContext> {
  return config;
}
