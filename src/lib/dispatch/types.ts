/**
 * Types for the GitHub Issue DAG Dispatcher
 */

/**
 * Configuration for the dispatch controller
 */
export interface DispatchConfig {
  /** GitHub personal access token */
  token: string;
  /** Repository owner (e.g., 'iota-uz') */
  owner: string;
  /** Repository name (e.g., 'foundry') */
  repo: string;
  /** Label to filter issues (default: 'queue') */
  queueLabel?: string;
  /** Maximum concurrent issues to dispatch (default: unlimited) */
  maxConcurrent?: number;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Dry run mode - don't actually dispatch */
  dryRun?: boolean;
  /** Output file path for matrix JSON */
  outputFile?: string;
}

/**
 * Represents a GitHub issue in the queue
 */
export interface QueuedIssue {
  /** Issue number */
  number: number;
  /** Issue title */
  title: string;
  /** Issue body (may contain dependency declarations) */
  body: string;
  /** Issue state ('open' or 'closed') */
  state: 'open' | 'closed';
  /** Issue labels */
  labels: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Issue URL for reference */
  htmlUrl: string;
  /** Repository owner (for cross-repo dependencies) */
  owner: string;
  /** Repository name (for cross-repo dependencies) */
  repo: string;
}

/**
 * Represents a dependency reference parsed from issue body
 */
export interface DependencyRef {
  /** Repository owner (defaults to current repo if not specified) */
  owner: string;
  /** Repository name (defaults to current repo if not specified) */
  repo: string;
  /** Issue number */
  number: number;
}

/**
 * Status of an issue in the DAG
 */
export type IssueStatus = 'READY' | 'BLOCKED' | 'CLOSED';

/**
 * Priority level for issues
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

/**
 * Represents an issue with resolved status and dependencies
 */
export interface ResolvedIssue {
  /** The underlying queued issue */
  issue: QueuedIssue;
  /** Computed status */
  status: IssueStatus;
  /** Parsed dependency references */
  dependencies: DependencyRef[];
  /** Blocking dependencies (open dependencies) */
  blockedBy: DependencyRef[];
  /** Priority level derived from labels */
  priority: PriorityLevel;
  /** Numeric priority for sorting (lower is higher priority) */
  priorityScore: number;
}

/**
 * Represents a node in the issue DAG
 */
export interface DagNode {
  /** Unique identifier (owner/repo#number) */
  id: string;
  /** The resolved issue */
  issue: ResolvedIssue;
  /** IDs of issues this depends on */
  dependsOn: string[];
  /** IDs of issues that depend on this */
  dependedBy: string[];
}

/**
 * Result of DAG cycle detection
 */
export interface CycleInfo {
  /** Whether a cycle was detected */
  hasCycle: boolean;
  /** Issues involved in the cycle */
  cycleNodes: string[];
  /** Human-readable cycle description */
  description: string;
}

/**
 * GitHub Actions matrix output structure
 */
export interface MatrixOutput {
  /** Array of ready issues for the matrix */
  include: MatrixEntry[];
}

/**
 * Single entry in the GitHub Actions matrix
 */
export interface MatrixEntry {
  /** Issue number */
  issue_number: number;
  /** Issue title */
  title: string;
  /** Priority level */
  priority: PriorityLevel;
  /** Numeric priority score */
  priority_score: number;
  /** Repository reference (owner/repo) */
  repository: string;
  /** Full issue URL */
  url: string;
}

/**
 * Complete dispatch result
 */
export interface DispatchResult {
  /** Total issues scanned */
  totalIssues: number;
  /** Ready issues (all dependencies closed) */
  readyIssues: ResolvedIssue[];
  /** Blocked issues (open dependencies) */
  blockedIssues: ResolvedIssue[];
  /** Issues with detected cycles (warning) */
  cycleWarnings: CycleInfo[];
  /** GitHub Actions matrix output */
  matrix: MatrixOutput;
  /** Timestamp of dispatch */
  timestamp: string;
  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Error types for dispatch operations
 */
export class DispatchError extends Error {
  constructor(
    message: string,
    public readonly code: DispatchErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DispatchError';
  }
}

/**
 * Error codes for dispatch operations
 */
export type DispatchErrorCode =
  | 'GITHUB_AUTH_ERROR'
  | 'GITHUB_RATE_LIMIT'
  | 'GITHUB_NOT_FOUND'
  | 'GITHUB_API_ERROR'
  | 'PARSE_ERROR'
  | 'INVALID_CONFIG'
  | 'CYCLE_DETECTED'
  | 'IO_ERROR';
