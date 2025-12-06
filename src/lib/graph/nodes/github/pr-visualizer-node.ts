/**
 * @sys/graph - GitHubPRVisualizerNode Implementation
 *
 * Injects a dynamic workflow status dashboard into PR body.
 * Uses Mermaid diagrams to visualize workflow progress.
 * Implements idempotent updates using HTML markers.
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext, Transition } from '../../types';
import {
  generateStatusDashboard,
  createDiagramNodes,
  updateDashboardInContent,
  type DiagramEdge,
} from '../../mermaid';

/**
 * Result of a PR visualization update.
 */
export interface PRVisualizerResult {
  /** Whether the update succeeded */
  success: boolean;

  /** PR number that was updated */
  prNumber: number;

  /** Whether the body was actually modified */
  modified: boolean;

  /** Error message if failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Workflow node definition for visualization.
 */
export interface WorkflowNodeMeta {
  /** Node type for display purposes */
  type?: string;

  /** Custom label for the diagram */
  label?: string;
}

/**
 * Value resolver - can be static or dynamic from state.
 */
type ValueResolver<TContext extends Record<string, unknown>, T> = T | ((state: WorkflowState<TContext>) => T);

/**
 * Configuration for GitHubPRVisualizerNode.
 */
export interface GitHubPRVisualizerNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * GitHub personal access token.
   */
  token: ValueResolver<TContext, string>;

  /**
   * Repository owner.
   */
  owner: ValueResolver<TContext, string>;

  /**
   * Repository name.
   */
  repo: ValueResolver<TContext, string>;

  /**
   * PR number to update.
   */
  prNumber?: ValueResolver<TContext, number>;

  /**
   * Context key to read PR number from.
   * @default 'prNumber'
   */
  prNumberKey?: string;

  /**
   * Current task description.
   */
  currentTask: ValueResolver<TContext, string>;

  /**
   * Current retry attempt (1-based).
   */
  retryAttempt?: ValueResolver<TContext, number>;

  /**
   * Maximum retry attempts.
   * @default 3
   */
  maxRetries?: number;

  /**
   * URL to GitHub Actions run logs.
   */
  actionsRunUrl?: ValueResolver<TContext, string | undefined>;

  /**
   * Map of workflow node names to metadata.
   * Used to determine diagram structure.
   */
  workflowNodes: Record<string, WorkflowNodeMeta>;

  /**
   * Edges between workflow nodes.
   * If not provided, will attempt to infer from node order.
   */
  workflowEdges?: DiagramEdge[];

  /**
   * Completed node names.
   */
  completedNodes?: ValueResolver<TContext, string[]>;

  /**
   * Context key to read completed nodes from.
   * @default 'completedNodes'
   */
  completedNodesKey?: string;

  /**
   * Failed node names (optional).
   */
  failedNodes?: ValueResolver<TContext, string[]>;

  /**
   * Custom marker ID for idempotent updates.
   * @default derived from workflow context
   */
  markerId?: ValueResolver<TContext, string>;

  /**
   * Dashboard title.
   * @default 'Workflow Status'
   */
  title?: string;

  /**
   * Where to place dashboard if not found.
   * @default 'bottom'
   */
  position?: 'top' | 'bottom';

  /**
   * Whether to throw on failure.
   * @default false
   */
  throwOnError?: boolean;

  /**
   * Key in context to store the result.
   * @default 'lastPRVisualizerResult'
   */
  resultKey?: string;
}

/**
 * GitHubPRVisualizerNode - Updates PR body with workflow visualization.
 *
 * Features:
 * - Generates Mermaid stateDiagram showing workflow progress
 * - Highlights active node, shows completed/failed nodes
 * - Displays status summary with current task and retry info
 * - Idempotent updates using HTML markers
 * - Preserves user-authored PR description content
 *
 * @example
 * ```typescript
 * nodes.GitHubPRVisualizerNode({
 *   token: process.env.GITHUB_TOKEN!,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   prNumberKey: 'prNumber',
 *   currentTask: (state) => state.context.currentTaskDescription,
 *   workflowNodes: {
 *     PLAN: { label: 'Planning' },
 *     BUILD: { label: 'Building' },
 *     QA: { label: 'Testing' },
 *     FIX: { label: 'Fixing' },
 *   },
 *   workflowEdges: [
 *     { from: 'PLAN', to: 'BUILD' },
 *     { from: 'BUILD', to: 'QA' },
 *     { from: 'QA', to: 'FIX', label: 'failure' },
 *     { from: 'FIX', to: 'QA', label: 'retry' },
 *     { from: 'QA', to: 'END', label: 'success' },
 *   ],
 *   completedNodesKey: 'completedNodes',
 *   next: 'BUILD',
 * })
 * ```
 */
export class GitHubPRVisualizerNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, GitHubPRVisualizerNodeConfig<TContext>> {

  public readonly nodeType = 'github-pr-visualizer';

  constructor(config: GitHubPRVisualizerNodeConfig<TContext>) {
    super({
      ...config,
      prNumberKey: config.prNumberKey ?? 'prNumber',
      completedNodesKey: config.completedNodesKey ?? 'completedNodes',
      maxRetries: config.maxRetries ?? 3,
      position: config.position ?? 'bottom',
      throwOnError: config.throwOnError ?? false,
      resultKey: config.resultKey ?? 'lastPRVisualizerResult',
      title: config.title ?? 'Workflow Status',
    });
  }

  /**
   * Resolves a value that may be static or a function.
   */
  private resolve<T>(value: ValueResolver<TContext, T>, state: WorkflowState<TContext>): T {
    return typeof value === 'function' ? (value as (state: WorkflowState<TContext>) => T)(state) : value;
  }

  /**
   * Resolves PR number from config or context.
   */
  private resolvePRNumber(state: WorkflowState<TContext>): number {
    if (this.config.prNumber !== undefined) {
      return this.resolve(this.config.prNumber, state);
    }

    const key = this.config.prNumberKey ?? 'prNumber';
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
      `PR number not found. Provide 'prNumber' in config or set '${key}' in workflow context.`,
      'config',
      this.nodeType
    );
  }

  /**
   * Resolves completed nodes from config or context.
   */
  private resolveCompletedNodes(state: WorkflowState<TContext>): string[] {
    if (this.config.completedNodes !== undefined) {
      return this.resolve(this.config.completedNodes, state);
    }

    const key = this.config.completedNodesKey ?? 'completedNodes';
    const contextValue = (state.context as Record<string, unknown>)[key];

    if (Array.isArray(contextValue)) {
      return contextValue.filter((v): v is string => typeof v === 'string');
    }

    return [];
  }

  /**
   * Resolves failed nodes from config or context.
   */
  private resolveFailedNodes(state: WorkflowState<TContext>): string[] {
    if (this.config.failedNodes !== undefined) {
      return this.resolve(this.config.failedNodes, state);
    }

    return [];
  }

  /**
   * Fetches the current PR body.
   */
  private async fetchPRBody(
    token: string,
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{ body: string; nodeId: string }> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new NodeExecutionError(
        `Failed to fetch PR: ${response.status} - ${error}`,
        `${owner}/${repo}#${prNumber}`,
        this.nodeType
      );
    }

    const data = await response.json() as { body: string | null; node_id: string };
    return {
      body: data.body ?? '',
      nodeId: data.node_id,
    };
  }

  /**
   * Updates the PR body.
   */
  private async updatePRBody(
    token: string,
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<void> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
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

    if (!response.ok) {
      const error = await response.text();
      throw new NodeExecutionError(
        `Failed to update PR: ${response.status} - ${error}`,
        `${owner}/${repo}#${prNumber}`,
        this.nodeType
      );
    }
  }

  /**
   * Executes the PR visualization update.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const startTime = Date.now();
    const { resultKey, throwOnError } = this.config;

    try {
      // Resolve configuration values
      const token = this.resolve(this.config.token, state);
      const owner = this.resolve(this.config.owner, state);
      const repo = this.resolve(this.config.repo, state);
      const prNumber = this.resolvePRNumber(state);
      const currentTask = this.resolve(this.config.currentTask, state);
      const retryAttempt = this.config.retryAttempt !== undefined
        ? this.resolve(this.config.retryAttempt, state)
        : undefined;
      const actionsRunUrl = this.config.actionsRunUrl !== undefined
        ? this.resolve(this.config.actionsRunUrl, state)
        : undefined;
      const markerId = this.config.markerId !== undefined
        ? this.resolve(this.config.markerId, state)
        : `workflow-${prNumber}`;

      const completedNodes = this.resolveCompletedNodes(state);
      const failedNodes = this.resolveFailedNodes(state);

      context.logger.info(
        `[GitHubPRVisualizerNode] Updating PR ${owner}/${repo}#${prNumber}`
      );

      // Fetch current PR body
      const { body: currentBody } = await this.fetchPRBody(token, owner, repo, prNumber);

      // Build diagram configuration
      const nodeNames = Object.keys(this.config.workflowNodes);
      const diagramNodes = createDiagramNodes(
        nodeNames,
        state.currentNode,
        completedNodes,
        failedNodes
      );

      // Apply custom labels
      for (const node of diagramNodes) {
        const meta = this.config.workflowNodes[node.id];
        if (meta?.label) {
          node.label = meta.label;
        }
      }

      // Get edges (provided or infer from node order)
      const edges = this.config.workflowEdges ?? this.inferEdges(nodeNames);

      // Generate dashboard
      // Build dashboard config with only defined values (for exactOptionalPropertyTypes)
      const dashboardConfig: Parameters<typeof generateStatusDashboard>[1] = {
        markerId,
        currentTask,
      };

      if (retryAttempt !== undefined) {
        dashboardConfig.retryAttempt = retryAttempt;
      }
      if (this.config.maxRetries !== undefined) {
        dashboardConfig.maxRetries = this.config.maxRetries;
      }
      if (actionsRunUrl !== undefined) {
        dashboardConfig.actionsRunUrl = actionsRunUrl;
      }
      if (this.config.title !== undefined) {
        dashboardConfig.title = this.config.title;
      }

      const dashboard = generateStatusDashboard(
        {
          nodes: diagramNodes,
          edges,
          activeNode: state.currentNode,
          direction: 'LR',
        },
        dashboardConfig
      );

      // Update content
      const newBody = updateDashboardInContent(
        currentBody,
        dashboard,
        markerId,
        this.config.position
      );

      // Check if modification is needed
      const modified = newBody !== currentBody;

      if (modified) {
        await this.updatePRBody(token, owner, repo, prNumber, newBody);
        context.logger.info(
          `[GitHubPRVisualizerNode] Updated PR body with workflow visualization`
        );
      } else {
        context.logger.info(
          `[GitHubPRVisualizerNode] No changes needed, PR body already up to date`
        );
      }

      const duration = Date.now() - startTime;
      const result: PRVisualizerResult = {
        success: true,
        prNumber,
        modified,
        duration,
      };

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
          prNumber,
          modified,
          duration,
        },
      };
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;

      if (err instanceof NodeExecutionError) {
        if (throwOnError) {
          throw err;
        }
      }

      const result: PRVisualizerResult = {
        success: false,
        prNumber: 0,
        modified: false,
        error: err.message,
        duration,
      };

      context.logger.error(
        `[GitHubPRVisualizerNode] Failed: ${err.message}`
      );

      if (throwOnError) {
        throw new NodeExecutionError(
          `PR visualization failed: ${err.message}`,
          'pr-visualizer',
          this.nodeType,
          err,
          { duration }
        );
      }

      // Store failure result
      const contextUpdate = {
        ...state.context,
        [resultKey!]: result,
      } as TContext;

      return {
        stateUpdate: {
          context: contextUpdate,
        },
        metadata: {
          error: err.message,
          duration,
        },
      };
    }
  }

  /**
   * Infers edges from node order (sequential flow).
   */
  private inferEdges(nodeNames: string[]): DiagramEdge[] {
    const edges: DiagramEdge[] = [];

    for (let i = 0; i < nodeNames.length - 1; i++) {
      edges.push({
        from: nodeNames[i]!,
        to: nodeNames[i + 1]!,
      });
    }

    // Add END transition from last node
    if (nodeNames.length > 0) {
      edges.push({
        from: nodeNames[nodeNames.length - 1]!,
        to: 'END',
      });
    }

    return edges;
  }
}

/**
 * Factory function to create a GitHubPRVisualizerNode definition.
 */
export function createGitHubPRVisualizerNode<TContext extends Record<string, unknown>>(
  config: Omit<GitHubPRVisualizerNodeConfig<TContext>, 'next'> & {
    next: Transition<TContext>;
  }
): GitHubPRVisualizerNodeConfig<TContext> {
  return config;
}
