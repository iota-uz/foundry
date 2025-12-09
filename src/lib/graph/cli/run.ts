#!/usr/bin/env bun
/**
 * Generic Graph Workflow CLI - runs dispatch or issue-processor workflows.
 * Run with --help for usage information.
 */

import * as path from 'path';
import { GraphEngine } from '../engine';
import { createInitialWorkflowState, type WorkflowConfig } from '../schema';
import {
  buildDispatchContext,
  buildIssueProcessorContext,
  getRuntimeConfig,
} from './context-builders';
import { createNodeRuntimes, NodeAdapter } from './utils';
import { SetDoneStatusNodeRuntime } from '../nodes';
import { runDispatchWorkflow, type DispatchWorkflowConfig } from '../../dispatch/dispatch-workflow';
import { ENV, WORKFLOW_ID } from '../constants';
import {
  formatResultSummary,
  writeMatrixToFile,
  setGitHubActionsOutput,
} from '../../dispatch/dispatcher';
import type { IssueContext } from '../workflows/issue-processor.workflow';

interface CliArgs {
  configPath?: string;
  verbose: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
      default:
        // First non-flag argument is the config path
        if (arg && !arg.startsWith('-') && !result.configPath) {
          result.configPath = arg;
        }
        break;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
graph - Generic Graph Workflow CLI

USAGE
  bun run graph <config-file> [--verbose] [--help]

ARGUMENTS
  <config-file>    Path to workflow config (dispatch.config.ts, issue-processor.config.ts)

OPTIONS
  -v, --verbose    Enable verbose logging
  -h, --help       Show this help

REQUIRED ENV VARS
  GITHUB_TOKEN         GitHub personal access token
  GITHUB_REPOSITORY    Repository (owner/repo format)

EXAMPLES
  # Dispatch workflow
  GRAPH_SOURCE=project GRAPH_PROJECT_NUMBER=14 bun run graph dispatch.config.ts

  # Issue processor
  GRAPH_ISSUE_NUMBER=123 ANTHROPIC_API_KEY=sk-xxx bun run graph issue-processor.config.ts

See config files for workflow-specific environment variables.
`);
}

interface IssueData {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: string;
}

/**
 * Fetch issue data using the GitHub CLI (gh).
 */
async function fetchIssueWithGhCli(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueData> {
  const proc = Bun.spawn([
    'gh', 'issue', 'view', String(issueNumber),
    '--repo', `${owner}/${repo}`,
    '--json', 'number,title,body,labels,state'
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const output = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Failed to fetch issue: ${stderr}`);
  }

  const data = JSON.parse(output) as {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
    state: string;
  };

  return {
    number: data.number,
    title: data.title,
    body: data.body || '',
    labels: data.labels.map((label) => label.name),
    state: data.state,
  };
}

async function runDispatch(verbose: boolean): Promise<void> {
  const context = buildDispatchContext();
  const runtimeConfig = getRuntimeConfig();

  const config: DispatchWorkflowConfig = {
    sourceType: context.sourceType,
    token: context.token,
    owner: context.owner,
    repo: context.repo,
    verbose: verbose || runtimeConfig.verbose,
    ...(context.dryRun !== undefined && { dryRun: context.dryRun }),
    ...(context.label !== undefined && { label: context.label }),
    ...(context.projectOwner !== undefined && { projectOwner: context.projectOwner }),
    ...(context.projectNumber !== undefined && { projectNumber: context.projectNumber }),
    ...(context.readyStatus !== undefined && { readyStatus: context.readyStatus }),
    ...(context.inProgressStatus !== undefined && { inProgressStatus: context.inProgressStatus }),
    ...(context.maxConcurrent !== undefined && { maxConcurrent: context.maxConcurrent }),
    ...(context.priorityField !== undefined && { priorityField: context.priorityField }),
  };

  const result = await runDispatchWorkflow(config);

  // Print summary
  console.log(formatResultSummary(result));

  // Write to output file if specified
  const outputFile = runtimeConfig.outputFile;
  if (outputFile) {
    await writeMatrixToFile(result.matrix, outputFile);
    console.log(`\nMatrix written to: ${outputFile}`);
  }

  // Set GitHub Actions output
  if (process.env[ENV.GITHUB_ACTIONS] === 'true') {
    await setGitHubActionsOutput(result.matrix);
  }

  // Exit with 0 even if no ready issues
  if (result.readyIssues.length === 0) {
    console.log('\nNo issues ready for execution.');
  }
}

/**
 * Run the issue processor workflow using the GraphEngine.
 *
 * Note: Uses WorkflowConfig<string, Record<string, unknown>> because the
 * actual workflow types are determined at runtime by the dynamically loaded
 * config file. This is a generic CLI runner that handles any workflow.
 */
async function runIssueProcessor(
  workflow: WorkflowConfig<string, Record<string, unknown>>,
  verbose: boolean
): Promise<void> {
  const context = buildIssueProcessorContext() as IssueContext;
  const runtimeConfig = getRuntimeConfig();

  // Get API key
  const apiKey = process.env[ENV.ANTHROPIC_API_KEY];
  if (!apiKey) {
    throw new Error(`${ENV.ANTHROPIC_API_KEY} environment variable is required`);
  }

  // Parse repository for gh CLI
  const [owner, repo] = context.repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${context.repository}`);
  }

  // Fetch issue data
  if (verbose) {
    console.log(`Fetching issue #${context.issueNumber}...`);
  }

  const issue = await fetchIssueWithGhCli(owner, repo, context.issueNumber);

  // Update context with issue data
  context.issueTitle = issue.title;
  context.issueBody = issue.body;

  if (verbose) {
    console.log('Issue Data:');
    console.log(`  Title: ${issue.title}`);
    console.log(`  State: ${issue.state}`);
    console.log(`  Labels: ${issue.labels.join(', ') || 'none'}`);
  }

  // Create initial state
  const initialState = createInitialWorkflowState(workflow);

  // Merge our context into the initial state
  const state = {
    ...initialState,
    context: {
      ...initialState.context,
      ...context,
    },
  };

  // Create node runtimes from workflow definition
  const nodes = createNodeRuntimes(workflow);

  // Inject SetDoneStatusNodeRuntime if project configuration is provided
  if (context.projectOwner && context.projectNumber) {
    const setDoneStatusRuntime = new SetDoneStatusNodeRuntime<IssueContext>({
      verbose: verbose || runtimeConfig.verbose,
      next: () => 'REPORT',
    });
    nodes['SET_DONE_STATUS'] = new NodeAdapter('SET_DONE_STATUS', setDoneStatusRuntime);
    if (verbose) {
      console.log('Injected SetDoneStatusNodeRuntime for project status updates');
    }
  }

  // Create and run engine
  console.log('\nStarting workflow...');
  const engine = new GraphEngine({
    stateDir: runtimeConfig.stateDir,
    apiKey,
    nodes,
    maxRetries: 1,
  });

  // Set environment variable for REPORT node
  process.env['ISSUE_NUMBER'] = String(context.issueNumber);

  // Cast is necessary because workflow context type is determined at runtime
  // by the dynamically loaded workflow configuration
  const finalState = await engine.run(
    `issue-${context.issueNumber}`,
    state as Parameters<typeof engine.run>[1]
  );

  console.log('\n=== WORKFLOW COMPLETE ===');
  console.log('Final Status:', finalState.status);

  // Access tasks from the final context - type is workflow-specific
  type TaskContext = { tasks?: Array<{ completed: boolean }> };
  const ctx = finalState.context as TaskContext;
  const completedCount = ctx.tasks?.filter((t) => t.completed).length ?? 0;
  const totalCount = ctx.tasks?.length ?? 0;
  console.log('Tasks Completed:', completedCount);
  console.log('Total Tasks:', totalCount);
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.configPath) {
    console.error('Error: Config file path is required');
    console.error('Usage: bun run src/lib/graph/cli/run.ts <config-file> [--verbose]');
    process.exit(1);
  }

  // Resolve config path
  const configPath = path.resolve(args.configPath);

  // Check verbose from env or args
  const verbose = args.verbose || process.env[ENV.GRAPH_VERBOSE] === 'true';

  if (verbose) {
    console.log('Configuration:');
    console.log(`  Config File: ${configPath}`);
    console.log(`  Verbose: ${verbose}`);
  }

  try {
    // Dynamic import the workflow config
    // Type is WorkflowConfig<string, Record<string, unknown>> because specific
    // workflow types are unknown at compile time - they're determined by the
    // user's config file loaded at runtime
    const workflowModule = await import(configPath);
    const workflow = workflowModule.default as WorkflowConfig<string, Record<string, unknown>>;

    if (!workflow || !workflow.id) {
      throw new Error(`Invalid workflow config: ${configPath} (must export default workflow)`);
    }

    if (verbose) {
      console.log(`  Workflow ID: ${workflow.id}`);
    }

    // Route to appropriate workflow runner
    switch (workflow.id) {
      case WORKFLOW_ID.DISPATCH:
        await runDispatch(verbose);
        break;

      case WORKFLOW_ID.ISSUE_PROCESSOR:
        await runIssueProcessor(workflow, verbose);
        break;

      default:
        throw new Error(
          `Unknown workflow ID: ${workflow.id}. Supported: ${WORKFLOW_ID.DISPATCH}, ${WORKFLOW_ID.ISSUE_PROCESSOR}`
        );
    }
  } catch (error) {
    const err = error as Error;
    console.error('\n=== WORKFLOW FAILED ===');
    console.error('Error:', err.message);
    if (verbose && err.stack) {
      console.error('Stack:', err.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
