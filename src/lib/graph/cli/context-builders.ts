/**
 * Context Builders for Graph Workflows
 *
 * Factory functions that build workflow context from environment variables.
 * All workflow-specific configuration is read from GRAPH_* env vars.
 */

import type { IssueContext } from '../workflows/issue-processor.workflow';
import type { DispatchContext } from '../../dispatch/dispatch-workflow';
import type { IssueSourceType } from '../nodes/dispatch/fetch-issues-node';
import { ENV, DEFAULTS } from '../constants';

/**
 * Parse GITHUB_REPOSITORY env var into owner/repo.
 */
function parseRepository(): { owner: string; repo: string; repository: string } {
  const ghRepo = process.env[ENV.GITHUB_REPOSITORY];
  if (!ghRepo) {
    throw new Error(`${ENV.GITHUB_REPOSITORY} environment variable is required`);
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
  const token = getRequiredEnv(ENV.GITHUB_TOKEN);
  const sourceType = (getEnv(ENV.GRAPH_SOURCE, DEFAULTS.SOURCE) as IssueSourceType);

  const context: DispatchContext = {
    sourceType,
    token,
    owner,
    repo,
    readyStatus: getEnv(ENV.GRAPH_READY_STATUS, DEFAULTS.READY_STATUS),
    inProgressStatus: getEnv(ENV.GRAPH_IN_PROGRESS_STATUS, DEFAULTS.IN_PROGRESS_STATUS),
    priorityField: getEnv(ENV.GRAPH_PRIORITY_FIELD, DEFAULTS.PRIORITY_FIELD),
    label: getEnv(ENV.GRAPH_LABEL, DEFAULTS.LABEL),
  };

  // Add optional project config
  const projectOwner = process.env[ENV.GRAPH_PROJECT_OWNER];
  const projectNumber = getEnvNumber(ENV.GRAPH_PROJECT_NUMBER);
  const maxConcurrent = getEnvNumber(ENV.GRAPH_MAX_CONCURRENT);
  const dryRun = process.env[ENV.GRAPH_DRY_RUN] === 'true';

  if (projectOwner) context.projectOwner = projectOwner;
  if (projectNumber) context.projectNumber = projectNumber;
  if (maxConcurrent) context.maxConcurrent = maxConcurrent;
  if (dryRun) context.dryRun = dryRun;

  // Validate project source config
  if (sourceType === 'project') {
    if (!projectNumber) {
      throw new Error(`${ENV.GRAPH_PROJECT_NUMBER} is required for project source`);
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
  const issueNumber = getEnvNumber(ENV.GRAPH_ISSUE_NUMBER);

  if (!issueNumber) {
    throw new Error(`${ENV.GRAPH_ISSUE_NUMBER} environment variable is required`);
  }

  const context: IssueContext = {
    issueNumber,
    issueTitle: '', // Will be populated by workflow
    issueBody: '', // Will be populated by workflow
    repository,
    baseBranch: getEnv(ENV.GRAPH_BASE_BRANCH, DEFAULTS.BASE_BRANCH),
    currentTaskIndex: 0,
    testsPassed: false,
    allTasksComplete: false,
    fixAttempts: 0,
    maxFixAttempts: DEFAULTS.MAX_FIX_ATTEMPTS,
    completedNodes: [],
    failedNodes: [],
  };

  // Add optional project config
  const projectOwner = process.env[ENV.GRAPH_PROJECT_OWNER];
  const projectNumber = getEnvNumber(ENV.GRAPH_PROJECT_NUMBER);
  const doneStatus = process.env[ENV.GRAPH_DONE_STATUS];
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
  const runId = process.env[ENV.GITHUB_RUN_ID];
  const serverUrl = process.env[ENV.GITHUB_SERVER_URL];
  const repository = process.env[ENV.GITHUB_REPOSITORY];

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
  const outputFile = process.env[ENV.GRAPH_OUTPUT_FILE];
  return {
    stateDir: getEnv(ENV.GRAPH_STATE_DIR, DEFAULTS.STATE_DIR),
    verbose: process.env[ENV.GRAPH_VERBOSE] === 'true',
    outputFile,
  };
}
