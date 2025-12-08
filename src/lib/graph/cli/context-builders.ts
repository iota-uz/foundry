/**
 * Context Builders for Graph Workflows
 *
 * Factory functions that build workflow context from environment variables.
 * All workflow-specific configuration is read from GRAPH_* env vars.
 */

import type { IssueContext } from '../workflows/issue-processor.workflow';
import type { DispatchContext } from '../../dispatch/dispatch-workflow';
import type { IssueSourceType } from '../nodes/dispatch/fetch-issues-node';

/**
 * Parse GITHUB_REPOSITORY env var into owner/repo.
 */
function parseRepository(): { owner: string; repo: string; repository: string } {
  const ghRepo = process.env['GITHUB_REPOSITORY'];
  if (!ghRepo) {
    throw new Error('GITHUB_REPOSITORY environment variable is required');
  }

  const parts = ghRepo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: ${ghRepo} (expected owner/repo)`);
  }

  return {
    owner: parts[0],
    repo: parts[1],
    repository: ghRepo,
  };
}

/**
 * Get required environment variable.
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

/**
 * Get optional environment variable with default.
 */
function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Get optional number from environment.
 */
function getEnvNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Build context for the dispatch workflow from environment variables.
 *
 * Required env vars:
 * - GITHUB_TOKEN
 * - GITHUB_REPOSITORY
 *
 * Optional env vars:
 * - GRAPH_SOURCE (default: 'label')
 * - GRAPH_LABEL (default: 'queue')
 * - GRAPH_PROJECT_OWNER
 * - GRAPH_PROJECT_NUMBER
 * - GRAPH_READY_STATUS (default: 'Ready')
 * - GRAPH_IN_PROGRESS_STATUS (default: 'In Progress')
 * - GRAPH_MAX_CONCURRENT (default: 3)
 */
export function buildDispatchContext(): DispatchContext {
  const { owner, repo } = parseRepository();
  const token = getRequiredEnv('GITHUB_TOKEN');
  const sourceType = (getEnv('GRAPH_SOURCE', 'label') as IssueSourceType);

  const context: DispatchContext = {
    sourceType,
    token,
    owner,
    repo,
    readyStatus: getEnv('GRAPH_READY_STATUS', 'Ready'),
    inProgressStatus: getEnv('GRAPH_IN_PROGRESS_STATUS', 'In Progress'),
    priorityField: getEnv('GRAPH_PRIORITY_FIELD', 'Priority'),
    label: getEnv('GRAPH_LABEL', 'queue'),
  };

  // Add optional project config
  const projectOwner = process.env['GRAPH_PROJECT_OWNER'];
  const projectNumber = getEnvNumber('GRAPH_PROJECT_NUMBER');
  const maxConcurrent = getEnvNumber('GRAPH_MAX_CONCURRENT');
  const dryRun = process.env['GRAPH_DRY_RUN'] === 'true';

  if (projectOwner) context.projectOwner = projectOwner;
  if (projectNumber) context.projectNumber = projectNumber;
  if (maxConcurrent) context.maxConcurrent = maxConcurrent;
  if (dryRun) context.dryRun = dryRun;

  // Validate project source config
  if (sourceType === 'project') {
    if (!projectNumber) {
      throw new Error('GRAPH_PROJECT_NUMBER is required for project source');
    }
  }

  return context;
}

/**
 * Build context for the issue-processor workflow from environment variables.
 *
 * Required env vars:
 * - GITHUB_TOKEN (or GH_TOKEN)
 * - GITHUB_REPOSITORY
 * - GRAPH_ISSUE_NUMBER
 *
 * Optional env vars:
 * - GRAPH_BASE_BRANCH (default: 'main')
 * - GRAPH_PROJECT_OWNER
 * - GRAPH_PROJECT_NUMBER
 * - GRAPH_DONE_STATUS (default: 'Done')
 * - GRAPH_STATE_DIR (default: '.graph-state')
 */
export function buildIssueProcessorContext(): IssueContext {
  const { repository } = parseRepository();
  const issueNumber = getEnvNumber('GRAPH_ISSUE_NUMBER');

  if (!issueNumber) {
    throw new Error('GRAPH_ISSUE_NUMBER environment variable is required');
  }

  const context: IssueContext = {
    issueNumber,
    issueTitle: '', // Will be populated by workflow
    issueBody: '', // Will be populated by workflow
    repository,
    baseBranch: getEnv('GRAPH_BASE_BRANCH', 'main'),
    currentTaskIndex: 0,
    testsPassed: false,
    allTasksComplete: false,
    fixAttempts: 0,
    maxFixAttempts: 3,
    completedNodes: [],
    failedNodes: [],
  };

  // Add optional project config
  const projectOwner = process.env['GRAPH_PROJECT_OWNER'];
  const projectNumber = getEnvNumber('GRAPH_PROJECT_NUMBER');
  const doneStatus = process.env['GRAPH_DONE_STATUS'];
  const actionsRunUrl = buildActionsRunUrl();

  if (projectOwner) context.projectOwner = projectOwner;
  if (projectNumber) context.projectNumber = projectNumber;
  if (doneStatus) context.doneStatus = doneStatus;
  if (actionsRunUrl) context.actionsRunUrl = actionsRunUrl;

  return context;
}

/**
 * Build GitHub Actions run URL from environment.
 */
function buildActionsRunUrl(): string | undefined {
  const runId = process.env['GITHUB_RUN_ID'];
  const serverUrl = process.env['GITHUB_SERVER_URL'];
  const repository = process.env['GITHUB_REPOSITORY'];

  if (runId && serverUrl && repository) {
    return `${serverUrl}/${repository}/actions/runs/${runId}`;
  }

  return undefined;
}

/**
 * Get runtime configuration from environment.
 */
export function getRuntimeConfig(): {
  stateDir: string;
  verbose: boolean;
  outputFile: string | undefined;
} {
  const outputFile = process.env['GRAPH_OUTPUT_FILE'];
  return {
    stateDir: getEnv('GRAPH_STATE_DIR', '.graph-state'),
    verbose: process.env['GRAPH_VERBOSE'] === 'true',
    outputFile,
  };
}
