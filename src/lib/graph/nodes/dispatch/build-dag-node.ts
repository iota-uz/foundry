/**
 * @sys/graph - BuildDagNode Implementation
 *
 * Builds a DAG (Directed Acyclic Graph) from issues and their dependencies.
 * Uses GitHub sub-issues for dependency tracking.
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext } from '../../types';
import type {
  QueuedIssue,
  ResolvedIssue,
  DependencyRef,
  DagNode,
  CycleInfo,
  PriorityLevel,
  IssueStatus,
} from '../../../dispatch/types';
import type { IssueSourceType } from './fetch-issues-node';

/**
 * Result of building the DAG.
 */
export interface BuildDagResult {
  /** Whether the build succeeded */
  success: boolean;

  /** Total issues processed */
  totalIssues: number;

  /** Ready issues (all dependencies met) */
  readyIssues: ResolvedIssue[];

  /** Blocked issues (waiting on dependencies) */
  blockedIssues: ResolvedIssue[];

  /** Detected cycles (warnings) */
  cycleWarnings: CycleInfo[];

  /** Error message if build failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Configuration for BuildDagNode.
 */
export interface BuildDagNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * GitHub personal access token (for fetching sub-issue status).
   */
  token: string;

  /**
   * Default repository owner.
   */
  owner: string;

  /**
   * Default repository name.
   */
  repo: string;

  /**
   * Key in context to read issues from.
   * @default 'issues'
   */
  issuesKey?: string;

  /**
   * Key in context to read source type from.
   * @default 'sourceType'
   */
  sourceTypeKey?: string;

  /**
   * Key in context to store the result.
   * @default 'dagResult'
   */
  resultKey?: string;

  /**
   * Key in context to store ready issues.
   * @default 'readyIssues'
   */
  readyIssuesKey?: string;

  /**
   * Key in context to store blocked issues.
   * @default 'blockedIssues'
   */
  blockedIssuesKey?: string;

  /**
   * Whether to throw on build failure.
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
 * Priority score mapping (lower is higher priority).
 */
const PRIORITY_SCORES: Record<PriorityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

/**
 * BuildDagNode - Builds dependency DAG from issues.
 *
 * @example
 * ```typescript
 * schema.custom('BUILD_DAG', {
 *   nodeType: 'build-dag',
 *   token: process.env.GITHUB_TOKEN!,
 *   owner: 'iota-uz',
 *   repo: 'iota-sdk',
 *   then: () => 'SET_IN_PROGRESS',
 * })
 * ```
 */
export class BuildDagNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, BuildDagNodeConfig<TContext>> {

  public readonly nodeType = 'build-dag';

  /** Cache of issue states by ID */
  private issueStateCache: Map<string, 'open' | 'closed'> = new Map();

  constructor(config: BuildDagNodeConfig<TContext>) {
    super({
      ...config,
      issuesKey: config.issuesKey ?? 'issues',
      sourceTypeKey: config.sourceTypeKey ?? 'sourceType',
      resultKey: config.resultKey ?? 'dagResult',
      readyIssuesKey: config.readyIssuesKey ?? 'readyIssues',
      blockedIssuesKey: config.blockedIssuesKey ?? 'blockedIssues',
      throwOnError: config.throwOnError ?? true,
      verbose: config.verbose ?? false,
    });

    this.validateConfig();
  }

  /**
   * Validates required configuration fields.
   */
  private validateConfig(): void {
    const { token, owner, repo } = this.config;

    const missing: string[] = [];
    if (!token) missing.push('token');
    if (!owner) missing.push('owner');
    if (!repo) missing.push('repo');

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
   * Executes the DAG building.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      issuesKey,
      sourceTypeKey,
      resultKey,
      readyIssuesKey,
      blockedIssuesKey,
      throwOnError,
    } = this.config;

    const startTime = Date.now();

    try {
      // Get issues from context
      const issues = (state.context as Record<string, unknown>)[issuesKey!] as QueuedIssue[] | undefined;
      const sourceType = (state.context as Record<string, unknown>)[sourceTypeKey!] as IssueSourceType | undefined;

      if (!issues || !Array.isArray(issues)) {
        throw new NodeExecutionError(
          `No issues found in context at key '${issuesKey}'`,
          'context',
          this.nodeType
        );
      }

      context.logger.info(
        `[BuildDagNode] Building DAG from ${issues.length} issues (source: ${sourceType ?? 'unknown'})`
      );

      // Fetch sub-issues for all issues
      await this.populateSubIssues(issues, context);

      // Resolve each issue
      const resolvedIssues = await this.resolveIssues(issues, sourceType, context);

      // Build the DAG
      const dagNodes = this.buildDagNodes(resolvedIssues);

      // Detect cycles
      const cycleWarnings = this.detectCycles(dagNodes);

      // Separate ready and blocked issues
      const readyIssues = resolvedIssues.filter(
        (r) => r.status === 'READY' && r.isLeaf
      );
      const blockedIssues = resolvedIssues.filter(
        (r) => r.status === 'BLOCKED' || !r.isLeaf
      );

      // Sort ready issues by priority
      readyIssues.sort((a, b) => a.priorityScore - b.priorityScore);

      const duration = Date.now() - startTime;

      const result: BuildDagResult = {
        success: true,
        totalIssues: issues.length,
        readyIssues,
        blockedIssues,
        cycleWarnings,
        duration,
      };

      context.logger.info(
        `[BuildDagNode] Built DAG: ${readyIssues.length} ready, ${blockedIssues.length} blocked in ${duration}ms`
      );

      if (cycleWarnings.length > 0) {
        context.logger.warn(
          `[BuildDagNode] Detected ${cycleWarnings.length} cycle(s) in dependency graph`
        );
      }

      // Store results in context
      const contextUpdate = {
        ...state.context,
        [resultKey!]: result,
        [readyIssuesKey!]: readyIssues,
        [blockedIssuesKey!]: blockedIssues,
      } as TContext;

      return {
        stateUpdate: {
          context: contextUpdate,
        },
        metadata: {
          duration,
          totalIssues: issues.length,
          readyCount: readyIssues.length,
          blockedCount: blockedIssues.length,
          cycleCount: cycleWarnings.length,
        },
      };
    } catch (error) {
      const err = error as Error;

      if (err instanceof NodeExecutionError) {
        throw err;
      }

      const duration = Date.now() - startTime;

      if (throwOnError === true) {
        throw new NodeExecutionError(
          `Failed to build DAG: ${err.message}`,
          'build',
          this.nodeType,
          err,
          { duration }
        );
      }

      const result: BuildDagResult = {
        success: false,
        totalIssues: 0,
        readyIssues: [],
        blockedIssues: [],
        cycleWarnings: [],
        error: err.message,
        duration,
      };

      return {
        stateUpdate: {
          context: {
            ...state.context,
            [resultKey!]: result,
            [readyIssuesKey!]: [],
            [blockedIssuesKey!]: [],
          } as TContext,
        },
        metadata: { duration, error: err.message },
      };
    }
  }

  /**
   * Populates sub-issues for all issues.
   */
  private async populateSubIssues(
    issues: QueuedIssue[],
    context: GraphContext
  ): Promise<void> {
    for (const issue of issues) {
      if (issue.subIssueNumbers && issue.subIssueNumbers.length > 0) {
        continue; // Already populated
      }

      const subIssueNumbers = await this.fetchSubIssueNumbers(
        issue.owner,
        issue.repo,
        issue.number
      );

      issue.subIssueNumbers = subIssueNumbers;

      if (subIssueNumbers.length > 0) {
        context.logger.debug?.(
          `[BuildDagNode] Issue #${issue.number} has ${subIssueNumbers.length} sub-issues`
        );
      }
    }
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
                state
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
                nodes: Array<{ number: number; state: string }>;
              };
            } | null;
          } | null;
        };
      }

      const data = (await response.json()) as SubIssuesResponse;
      const subIssues = data.data?.repository?.issue?.subIssues?.nodes ?? [];

      // Cache sub-issue states
      for (const sub of subIssues) {
        const id = `${owner}/${repo}#${sub.number}`;
        this.issueStateCache.set(
          id,
          sub.state === 'CLOSED' ? 'closed' : 'open'
        );
      }

      return subIssues.map((s) => s.number);
    } catch {
      return [];
    }
  }

  /**
   * Resolves issues to their dependency status.
   */
  private async resolveIssues(
    issues: QueuedIssue[],
    sourceType: IssueSourceType | undefined,
    _context: GraphContext
  ): Promise<ResolvedIssue[]> {
    const resolved: ResolvedIssue[] = [];

    for (const issue of issues) {
      const dependencies: DependencyRef[] = [];
      const blockedBy: DependencyRef[] = [];

      // Sub-issues are dependencies
      for (const subNumber of issue.subIssueNumbers ?? []) {
        const ref: DependencyRef = {
          owner: issue.owner,
          repo: issue.repo,
          number: subNumber,
        };
        dependencies.push(ref);

        // Check if sub-issue is open (blocking)
        const subId = `${issue.owner}/${issue.repo}#${subNumber}`;
        const subState = this.issueStateCache.get(subId);

        if (subState === 'open') {
          blockedBy.push(ref);
        }
      }

      // Determine status
      let status: IssueStatus;
      if (issue.state === 'closed') {
        status = 'CLOSED';
      } else if (blockedBy.length > 0) {
        status = 'BLOCKED';
      } else {
        status = 'READY';
      }

      // Extract priority
      const priority = this.extractPriority(issue, sourceType);
      const priorityScore = PRIORITY_SCORES[priority];

      // Determine if this is a leaf issue (no sub-issues)
      const isLeaf = (issue.subIssueNumbers ?? []).length === 0;

      resolved.push({
        issue,
        status,
        dependencies,
        blockedBy,
        priority,
        priorityScore,
        isLeaf,
      });
    }

    return resolved;
  }

  /**
   * Extracts priority from issue based on source type.
   */
  private extractPriority(
    issue: QueuedIssue,
    _sourceType: IssueSourceType | undefined
  ): PriorityLevel {
    // Check for project priority (from FetchIssuesNode)
    const projectPriority = (issue as QueuedIssue & { projectPriority?: string }).projectPriority;
    if (projectPriority !== undefined && projectPriority !== '') {
      return this.normalizePriority(projectPriority);
    }

    // Check for priority labels
    for (const label of issue.labels) {
      const lower = label.toLowerCase();

      if (lower.startsWith('priority:')) {
        const value = lower.replace('priority:', '');
        return this.normalizePriority(value);
      }

      if (lower === 'critical' || lower === 'p0') return 'critical';
      if (lower === 'high' || lower === 'p1') return 'high';
      if (lower === 'medium' || lower === 'p2') return 'medium';
      if (lower === 'low' || lower === 'p3') return 'low';
    }

    return 'none';
  }

  /**
   * Normalizes priority string to PriorityLevel.
   */
  private normalizePriority(value: string): PriorityLevel {
    const lower = value.toLowerCase().trim();

    if (lower === 'critical' || lower === 'p0' || lower === '🔴') return 'critical';
    if (lower === 'high' || lower === 'p1' || lower === '🟠') return 'high';
    if (lower === 'medium' || lower === 'p2' || lower === '🟡') return 'medium';
    if (lower === 'low' || lower === 'p3' || lower === '🟢') return 'low';

    return 'none';
  }

  /**
   * Builds DAG nodes from resolved issues.
   */
  private buildDagNodes(issues: ResolvedIssue[]): Map<string, DagNode> {
    const nodes = new Map<string, DagNode>();

    // Create nodes
    for (const resolved of issues) {
      const id = `${resolved.issue.owner}/${resolved.issue.repo}#${resolved.issue.number}`;

      nodes.set(id, {
        id,
        issue: resolved,
        dependsOn: resolved.dependencies.map(
          (d) => `${d.owner}/${d.repo}#${d.number}`
        ),
        dependedBy: [],
      });
    }

    // Build reverse edges
    for (const [id, node] of nodes) {
      for (const depId of node.dependsOn) {
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.dependedBy.push(id);
        }
      }
    }

    return nodes;
  }

  /**
   * Detects cycles in the DAG.
   */
  private detectCycles(nodes: Map<string, DagNode>): CycleInfo[] {
    const cycles: CycleInfo[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycleNodes = path.slice(cycleStart);
        cycleNodes.push(nodeId);

        cycles.push({
          hasCycle: true,
          cycleNodes,
          description: `Cycle detected: ${cycleNodes.join(' → ')}`,
        });

        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = nodes.get(nodeId);
      if (node) {
        for (const depId of node.dependsOn) {
          if (nodes.has(depId)) {
            dfs(depId, [...path]);
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }
}

/**
 * Factory function to create a BuildDagNode definition.
 */
export function createBuildDagNode<TContext extends Record<string, unknown>>(
  config: Omit<BuildDagNodeConfig<TContext>, 'next'> & {
    next: (state: WorkflowState<TContext>) => string;
  }
): BuildDagNodeConfig<TContext> {
  return config;
}
