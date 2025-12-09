/**
 * Constants for Graph Workflow Engine
 *
 * Centralizes magic strings to prevent typos and enable IDE autocompletion.
 */

/**
 * Environment variable names used by the graph engine.
 */
export const ENV = {
  // GitHub
  GITHUB_TOKEN: 'GITHUB_TOKEN',
  GITHUB_REPOSITORY: 'GITHUB_REPOSITORY',
  GITHUB_RUN_ID: 'GITHUB_RUN_ID',
  GITHUB_SERVER_URL: 'GITHUB_SERVER_URL',
  GITHUB_ACTIONS: 'GITHUB_ACTIONS',

  // Anthropic
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',

  // Graph Engine - General
  GRAPH_SOURCE: 'GRAPH_SOURCE',
  GRAPH_VERBOSE: 'GRAPH_VERBOSE',
  GRAPH_STATE_DIR: 'GRAPH_STATE_DIR',
  GRAPH_OUTPUT_FILE: 'GRAPH_OUTPUT_FILE',
  GRAPH_DRY_RUN: 'GRAPH_DRY_RUN',

  // Graph Engine - Dispatch
  GRAPH_LABEL: 'GRAPH_LABEL',
  GRAPH_PROJECT_OWNER: 'GRAPH_PROJECT_OWNER',
  GRAPH_PROJECT_NUMBER: 'GRAPH_PROJECT_NUMBER',
  GRAPH_READY_STATUS: 'GRAPH_READY_STATUS',
  GRAPH_IN_PROGRESS_STATUS: 'GRAPH_IN_PROGRESS_STATUS',
  GRAPH_MAX_CONCURRENT: 'GRAPH_MAX_CONCURRENT',
  GRAPH_PRIORITY_FIELD: 'GRAPH_PRIORITY_FIELD',

  // Graph Engine - Issue Processor
  GRAPH_ISSUE_NUMBER: 'GRAPH_ISSUE_NUMBER',
  GRAPH_BASE_BRANCH: 'GRAPH_BASE_BRANCH',
  GRAPH_DONE_STATUS: 'GRAPH_DONE_STATUS',
} as const;

/**
 * Type for environment variable names.
 */
export type EnvVar = (typeof ENV)[keyof typeof ENV];

/**
 * Workflow identifiers.
 */
export const WORKFLOW_ID = {
  DISPATCH: 'dispatch',
  ISSUE_PROCESSOR: 'issue-processor',
} as const;

/**
 * Type for workflow IDs.
 */
export type WorkflowId = (typeof WORKFLOW_ID)[keyof typeof WORKFLOW_ID];

/**
 * Default values for environment variables.
 */
export const DEFAULTS = {
  SOURCE: 'label',
  LABEL: 'queue',
  STATE_DIR: '.graph-state',
  BASE_BRANCH: 'main',
  READY_STATUS: 'Ready',
  IN_PROGRESS_STATUS: 'In Progress',
  DONE_STATUS: 'Done',
  PRIORITY_FIELD: 'Priority',
  MAX_FIX_ATTEMPTS: 3,
} as const;
