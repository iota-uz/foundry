/**
 * Dispatch Workflow Runner
 *
 * Orchestrates the dispatch workflow using custom node runtimes:
 * 1. FETCH_ISSUES - Fetch issues from label or project source
 * 2. BUILD_DAG - Build dependency graph
 * 3. SET_IN_PROGRESS - Update status to "In Progress" (project source only)
 * 4. GENERATE_MATRIX - Generate GitHub Actions matrix output
 *
 * This is implemented as a direct orchestration rather than a graph config
 * because the dispatch nodes require async operations that don't fit the
 * eval node pattern.
 */

import { createLogger } from '@/lib/logging';
import {
  FetchIssuesNodeRuntime,
  type FetchIssuesNodeConfig,
  type IssueSourceType,
} from '../graph/nodes/dispatch/fetch-issues-node';
import {
  BuildDagNodeRuntime,
  type BuildDagNodeConfig,
} from '../graph/nodes/dispatch/build-dag-node';
import {
  SetStatusNodeRuntime,
  type SetStatusNodeConfig,
} from '../graph/nodes/dispatch/set-status-node';
import type {
  ResolvedIssue,
  MatrixOutput,
  MatrixEntry,
  DispatchResult,
} from './types';
import type { WorkflowState, GraphContext } from '../graph/types';
import { WorkflowStatus } from '../graph/enums';

/**
 * Configuration for the dispatch workflow.
 */
export interface DispatchWorkflowConfig {
  /** Issue source type */
  sourceType: IssueSourceType;

  /** GitHub token */
  token: string;

  /** Repository owner */
  owner: string;

  /** Repository name */
  repo: string;

  /** Maximum concurrent issues to dispatch */
  maxConcurrent?: number;

  /** Enable dry run (don't update status) */
  dryRun?: boolean;

  /** Enable verbose logging */
  verbose?: boolean;

  // Label source options
  /** Label to filter by (default: 'queue') */
  label?: string;

  // Project source options
  /** Project owner (for org projects) */
  projectOwner?: string;

  /** Project number */
  projectNumber?: number;

  /** Status to filter by (default: 'Ready') */
  readyStatus?: string;

  /** Status to set when processing (default: 'In Progress') */
  inProgressStatus?: string;

  /** Priority field name (default: 'Priority') */
  priorityField?: string;
}

/**
 * Dispatch workflow context.
 */
export interface DispatchContext extends Record<string, unknown> {
  sourceType: IssueSourceType;
  token: string;
  owner: string;
  repo: string;
  maxConcurrent?: number;
  dryRun?: boolean;

  // Project source config
  projectOwner?: string;
  projectNumber?: number;
  readyStatus?: string;
  inProgressStatus?: string;
  priorityField?: string;

  // Label source config
  label?: string;

  // Workflow results
  issues?: unknown[];
  readyIssues?: ResolvedIssue[];
  blockedIssues?: ResolvedIssue[];
  matrix?: MatrixOutput;
}

/**
 * Creates initial workflow state for dispatch.
 */
function createInitialState(config: DispatchWorkflowConfig): WorkflowState<DispatchContext> {
  const context: DispatchContext = {
    sourceType: config.sourceType,
    token: config.token,
    owner: config.owner,
    repo: config.repo,
    readyStatus: config.readyStatus ?? 'Ready',
    inProgressStatus: config.inProgressStatus ?? 'In Progress',
    priorityField: config.priorityField ?? 'Priority',
    label: config.label ?? 'queue',
  };

  // Only add optional properties if they have values
  if (config.maxConcurrent !== undefined) {
    context.maxConcurrent = config.maxConcurrent;
  }
  if (config.dryRun !== undefined) {
    context.dryRun = config.dryRun;
  }
  if (config.projectOwner !== undefined) {
    context.projectOwner = config.projectOwner;
  }
  if (config.projectNumber !== undefined) {
    context.projectNumber = config.projectNumber;
  }

  return {
    currentNode: 'FETCH_ISSUES',
    status: WorkflowStatus.Running,
    updatedAt: new Date().toISOString(),
    conversationHistory: [],
    context,
  };
}

/**
 * Null agent wrapper for dispatch workflow.
 * Dispatch nodes don't use the agent, so we provide a stub implementation.
 */
const nullAgentWrapper: GraphContext['agent'] = {
  runStep: async () => {
    throw new Error('Agent not available in dispatch workflow context');
  },
};

/**
 * Creates a mock GraphContext for node execution.
 */
function createGraphContext(_verbose: boolean): GraphContext {
  const logger = createLogger({ component: 'DispatchWorkflow' });

  return {
    logger,
    agent: nullAgentWrapper, // Not used by dispatch nodes
  };
}

/**
 * Generates the GitHub Actions matrix output from ready issues.
 */
function generateMatrix(
  readyIssues: ResolvedIssue[],
  maxConcurrent?: number
): MatrixOutput {
  // Sort by priority (lower score = higher priority)
  const sorted = [...readyIssues].sort((a, b) => a.priorityScore - b.priorityScore);

  // Limit if maxConcurrent is set
  const limited = (maxConcurrent !== undefined && maxConcurrent !== null && maxConcurrent > 0)
    ? sorted.slice(0, maxConcurrent)
    : sorted;

  const include: MatrixEntry[] = limited.map((resolved) => {
    const entry: MatrixEntry = {
      issue_number: resolved.issue.number,
      title: resolved.issue.title,
      priority: resolved.priority,
      priority_score: resolved.priorityScore,
      repository: `${resolved.issue.owner}/${resolved.issue.repo}`,
      url: resolved.issue.htmlUrl,
    };

    // Only add parent_issue_number if it has a value
    if (resolved.issue.parentIssueNumber !== undefined) {
      entry.parent_issue_number = resolved.issue.parentIssueNumber;
    }

    return entry;
  });

  return { include };
}

/**
 * Runs the dispatch workflow.
 *
 * @param config - Workflow configuration
 * @returns Dispatch result with ready issues and matrix
 */
export async function runDispatchWorkflow(
  config: DispatchWorkflowConfig
): Promise<DispatchResult> {
  const verbose = config.verbose ?? false;
  const context = createGraphContext(verbose);
  let state = createInitialState(config);

  context.logger.info('[DispatchWorkflow] Starting dispatch workflow...');
  context.logger.info(`[DispatchWorkflow] Source type: ${config.sourceType}`);

  const startTime = Date.now();

  try {
    // Step 1: FETCH_ISSUES
    context.logger.info('[DispatchWorkflow] Step 1: Fetching issues...');

    const fetchConfig: FetchIssuesNodeConfig<DispatchContext> = {
      sourceType: config.sourceType,
      token: config.token,
      owner: config.owner,
      repo: config.repo,
      next: () => 'BUILD_DAG',
    };

    // Add optional properties only if defined
    if (config.label !== undefined) fetchConfig.label = config.label;
    if (config.projectOwner !== undefined) fetchConfig.projectOwner = config.projectOwner;
    if (config.projectNumber !== undefined) fetchConfig.projectNumber = config.projectNumber;
    if (config.readyStatus !== undefined) fetchConfig.readyStatus = config.readyStatus;
    if (config.priorityField !== undefined) fetchConfig.priorityField = config.priorityField;
    if (verbose) fetchConfig.verbose = verbose;

    const fetchNode = new FetchIssuesNodeRuntime<DispatchContext>(fetchConfig);
    const fetchResult = await fetchNode.run('FETCH_ISSUES', state, context);

    state = {
      ...state,
      context: {
        ...state.context,
        ...fetchResult.stateUpdate.context,
      },
      currentNode: 'BUILD_DAG',
    };

    // Step 2: BUILD_DAG
    context.logger.info('[DispatchWorkflow] Step 2: Building dependency DAG...');

    const dagConfig: BuildDagNodeConfig<DispatchContext> = {
      token: config.token,
      owner: config.owner,
      repo: config.repo,
      verbose,
      next: () => 'SET_IN_PROGRESS',
    };

    const dagNode = new BuildDagNodeRuntime<DispatchContext>(dagConfig);
    const dagResult = await dagNode.run('BUILD_DAG', state, context);

    state = {
      ...state,
      context: {
        ...state.context,
        ...dagResult.stateUpdate.context,
      },
      currentNode: 'SET_IN_PROGRESS',
    };

    const readyIssues = state.context.readyIssues ?? [];
    const blockedIssues = state.context.blockedIssues ?? [];

    // Step 3: SET_IN_PROGRESS (project source only, not in dry run)
    if (config.sourceType === 'project' && config.dryRun !== true && readyIssues.length > 0) {
      context.logger.info('[DispatchWorkflow] Step 3: Setting status to "In Progress"...');

      const setStatusConfig: SetStatusNodeConfig<DispatchContext> = {
        token: config.token,
        projectOwner: config.projectOwner!,
        projectNumber: config.projectNumber!,
        status: config.inProgressStatus ?? 'In Progress',
        issuesKey: 'readyIssues',
        verbose,
        next: () => 'GENERATE_MATRIX',
      };

      const setStatusNode = new SetStatusNodeRuntime<DispatchContext>(setStatusConfig);
      const statusResult = await setStatusNode.run('SET_IN_PROGRESS', state, context);

      state = {
        ...state,
        context: {
          ...state.context,
          ...statusResult.stateUpdate.context,
        },
        currentNode: 'GENERATE_MATRIX',
      };
    } else {
      context.logger.info('[DispatchWorkflow] Step 3: Skipping status update (dry run or not project source)');
    }

    // Step 4: GENERATE_MATRIX
    context.logger.info('[DispatchWorkflow] Step 4: Generating matrix...');

    const matrix = generateMatrix(readyIssues, config.maxConcurrent);

    const duration = Date.now() - startTime;

    context.logger.info(`[DispatchWorkflow] Completed in ${duration}ms`);
    context.logger.info(`[DispatchWorkflow] Ready issues: ${readyIssues.length}`);
    context.logger.info(`[DispatchWorkflow] Blocked issues: ${blockedIssues.length}`);
    context.logger.info(`[DispatchWorkflow] Matrix entries: ${matrix.include.length}`);

    return {
      totalIssues: (state.context.issues as unknown[])?.length ?? 0,
      readyIssues,
      blockedIssues,
      cycleWarnings: [], // From DAG result if needed
      matrix,
      timestamp: new Date().toISOString(),
      dryRun: config.dryRun ?? false,
    };
  } catch (error) {
    const err = error as Error;
    context.logger.error(`[DispatchWorkflow] Failed: ${err.message}`);
    throw err;
  }
}

/**
 * Default configuration for iota-uz project.
 */
export const IOTA_UZ_CONFIG: Partial<DispatchWorkflowConfig> = {
  sourceType: 'project',
  projectOwner: 'iota-uz',
  projectNumber: 14,
  readyStatus: 'Ready',
  inProgressStatus: 'In Progress',
  priorityField: 'Priority',
};
