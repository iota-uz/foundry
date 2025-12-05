/**
 * Dispatch module - Public API
 *
 * A controller for managing GitHub Issue DAGs and dispatching
 * work to distributed workers via GitHub Actions matrix.
 */

// Types
export type {
  DispatchConfig,
  QueuedIssue,
  DependencyRef,
  IssueStatus,
  PriorityLevel,
  ResolvedIssue,
  DagNode,
  CycleInfo,
  MatrixOutput,
  MatrixEntry,
  DispatchResult,
  DispatchErrorCode,
} from './types';

export { DispatchError } from './types';

// GitHub Client
export { GitHubClient, createGitHubClient } from './github-client';

// Dependency Parser
export {
  parseDependencies,
  parseIssueReferences,
  formatDependencyRef,
  dependencyRefsEqual,
  createDependencyRef,
  parseDependencyRefString,
} from './dependency-parser';

// DAG Builder
export {
  DagBuilder,
  createIssueId,
  dependencyRefToId,
  extractPriority,
  getPriorityScore,
  sortByPriority,
  applyMaxConcurrent,
  formatBlockedBy,
} from './dag-builder';

// Dispatcher
export {
  dispatch,
  generateMatrix,
  formatResultSummary,
  writeMatrixToFile,
  setGitHubActionsOutput,
} from './dispatcher';

// CLI
export { main as dispatchCli, parseArgs, buildConfig, showHelp } from './cli';
