/**
 * DAG Builder for Issue Dependencies
 *
 * Builds a Directed Acyclic Graph from issues and their dependencies,
 * detects cycles, and determines READY/BLOCKED status.
 */

import type {
  QueuedIssue,
  ResolvedIssue,
  DependencyRef,
  DagNode,
  CycleInfo,
  IssueStatus,
  PriorityLevel,
  DispatchConfig,
} from './types';
import { parseDependencies, formatDependencyRef } from './dependency-parser';
import type { GitHubClient } from './github-client';

/**
 * Priority labels and their corresponding scores
 * Lower score = higher priority
 */
const PRIORITY_LABELS: Record<string, PriorityLevel> = {
  'priority:critical': 'critical',
  'priority:high': 'high',
  'priority:medium': 'medium',
  'priority:low': 'low',
};

const PRIORITY_SCORES: Record<PriorityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

/**
 * Create a unique ID for an issue
 */
export function createIssueId(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}#${number}`;
}

/**
 * Create issue ID from DependencyRef
 */
export function dependencyRefToId(ref: DependencyRef): string {
  return createIssueId(ref.owner, ref.repo, ref.number);
}

/**
 * Extract priority level from issue labels
 */
export function extractPriority(labels: string[]): PriorityLevel {
  for (const label of labels) {
    const normalizedLabel = label.toLowerCase();
    const priority = PRIORITY_LABELS[normalizedLabel];
    if (priority) {
      return priority;
    }
  }
  return 'none';
}

/**
 * Get numeric priority score for sorting
 */
export function getPriorityScore(priority: PriorityLevel): number {
  return PRIORITY_SCORES[priority];
}

/**
 * DAG Builder class
 */
export class DagBuilder {
  private readonly config: DispatchConfig;
  private readonly client: GitHubClient;
  private readonly verbose: boolean;

  /** Map of issue ID to DAG node */
  private nodes: Map<string, DagNode> = new Map();

  /** Cache of issue states for external dependencies */
  private issueStateCache: Map<string, 'open' | 'closed'> = new Map();

  constructor(config: DispatchConfig, client: GitHubClient) {
    this.config = config;
    this.client = client;
    this.verbose = config.verbose ?? false;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[DagBuilder] ${message}`);
    }
  }

  /**
   * Build the DAG from queued issues
   */
  async build(issues: QueuedIssue[]): Promise<Map<string, DagNode>> {
    this.nodes.clear();
    this.issueStateCache.clear();

    // First pass: create nodes and parse dependencies
    for (const issue of issues) {
      const id = createIssueId(issue.owner, issue.repo, issue.number);
      this.log(`Processing issue: ${id}`);

      const dependencies = parseDependencies(
        issue.body,
        this.config.owner,
        this.config.repo
      );

      const priority = extractPriority(issue.labels);
      const priorityScore = getPriorityScore(priority);

      // Determine initial status (will be updated after analyzing dependencies)
      const status: IssueStatus = issue.state === 'closed' ? 'CLOSED' : 'READY';

      const resolved: ResolvedIssue = {
        issue,
        status,
        dependencies,
        blockedBy: [], // Will be populated in second pass
        priority,
        priorityScore,
      };

      this.nodes.set(id, {
        id,
        issue: resolved,
        dependsOn: dependencies.map(dependencyRefToId),
        dependedBy: [],
      });
    }

    // Second pass: resolve dependency states and build reverse edges
    for (const node of Array.from(this.nodes.values())) {
      if (node.issue.status === 'CLOSED') continue;

      for (const depRef of node.issue.dependencies) {
        const depId = dependencyRefToId(depRef);
        const depNode = this.nodes.get(depId);

        // Add reverse edge
        if (depNode) {
          depNode.dependedBy.push(node.id);
        }

        // Check if dependency is blocking
        const isBlocking = await this.isDependencyBlocking(depRef);
        if (isBlocking) {
          node.issue.blockedBy.push(depRef);
        }
      }

      // Update status based on blocking dependencies
      if (node.issue.blockedBy.length > 0) {
        node.issue.status = 'BLOCKED';
      }
    }

    return this.nodes;
  }

  /**
   * Check if a dependency is blocking (i.e., not closed)
   */
  private async isDependencyBlocking(dep: DependencyRef): Promise<boolean> {
    const depId = dependencyRefToId(dep);

    // Check cache first
    const cached = this.issueStateCache.get(depId);
    if (cached !== undefined) {
      return cached === 'open';
    }

    // Check if it's in our local nodes
    const localNode = this.nodes.get(depId);
    if (localNode) {
      const state = localNode.issue.issue.state;
      this.issueStateCache.set(depId, state);
      return state === 'open';
    }

    // Fetch from GitHub (cross-repo or external dependency)
    try {
      const isClosed = await this.client.isDependencyClosed(dep);
      this.issueStateCache.set(depId, isClosed ? 'closed' : 'open');
      return !isClosed;
    } catch {
      // If we can't fetch, assume it's blocking (conservative)
      this.log(`Warning: Could not fetch dependency ${depId}, assuming blocking`);
      this.issueStateCache.set(depId, 'open');
      return true;
    }
  }

  /**
   * Detect cycles in the DAG using Tarjan's algorithm
   */
  detectCycles(): CycleInfo[] {
    const cycles: CycleInfo[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle - extract cycle nodes from current path
        const cycleStart = currentPath.indexOf(nodeId);
        const cycleNodes = cycleStart >= 0 ? currentPath.slice(cycleStart) : [nodeId];
        cycleNodes.push(nodeId); // Close the cycle

        cycles.push({
          hasCycle: true,
          cycleNodes,
          description: `Circular dependency detected: ${cycleNodes.join(' -> ')}`,
        });
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const depId of node.dependsOn) {
          // Only check nodes that are in our graph
          if (this.nodes.has(depId)) {
            dfs(depId);
          }
        }
      }

      currentPath.pop();
      recursionStack.delete(nodeId);
      return false;
    };

    // Run DFS from all nodes
    for (const nodeId of Array.from(this.nodes.keys())) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  /**
   * Get all ready issues (not blocked, not closed)
   */
  getReadyIssues(): ResolvedIssue[] {
    return Array.from(this.nodes.values())
      .filter((node) => node.issue.status === 'READY')
      .map((node) => node.issue);
  }

  /**
   * Get all blocked issues
   */
  getBlockedIssues(): ResolvedIssue[] {
    return Array.from(this.nodes.values())
      .filter((node) => node.issue.status === 'BLOCKED')
      .map((node) => node.issue);
  }

  /**
   * Get a specific node by ID
   */
  getNode(id: string): DagNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): DagNode[] {
    return Array.from(this.nodes.values());
  }
}

/**
 * Sort issues by priority
 */
export function sortByPriority(issues: ResolvedIssue[]): ResolvedIssue[] {
  return [...issues].sort((a, b) => {
    // First by priority score (lower is higher priority)
    if (a.priorityScore !== b.priorityScore) {
      return a.priorityScore - b.priorityScore;
    }
    // Then by creation date (FIFO - older first)
    return new Date(a.issue.createdAt).getTime() - new Date(b.issue.createdAt).getTime();
  });
}

/**
 * Apply MAX_CONCURRENT limit to ready issues
 */
export function applyMaxConcurrent(
  issues: ResolvedIssue[],
  maxConcurrent?: number
): ResolvedIssue[] {
  const sorted = sortByPriority(issues);

  if (maxConcurrent !== undefined && maxConcurrent > 0) {
    return sorted.slice(0, maxConcurrent);
  }

  return sorted;
}

/**
 * Format blocking dependencies as a human-readable string
 */
export function formatBlockedBy(refs: DependencyRef[]): string {
  if (refs.length === 0) return 'none';
  return refs.map(formatDependencyRef).join(', ');
}
