#!/usr/bin/env bun
/**
 * CLI for running the issue processor workflow
 *
 * Usage:
 *   bun run src/lib/graph/cli/run-issue.ts --issue <number> [options]
 *
 * Options:
 *   --issue <number>     GitHub issue number (required)
 *   --owner <owner>      Repository owner (from GITHUB_REPOSITORY)
 *   --repo <repo>        Repository name (from GITHUB_REPOSITORY)
 *   --base-branch <br>   Target branch for PRs (default: main)
 *   --state-dir <dir>    State directory (default: .graph-state)
 *   --dry-run            Print workflow config without executing
 *   --verbose            Enable verbose logging
 *   --help               Show help
 *
 * Environment Variables:
 *   GITHUB_TOKEN         GitHub personal access token (for gh CLI)
 *   GITHUB_REPOSITORY    Repository in owner/repo format
 *   ANTHROPIC_API_KEY    Anthropic API key for Claude
 *   GITHUB_RUN_ID        GitHub Actions run ID (for dashboard links)
 *   GITHUB_SERVER_URL    GitHub server URL (for dashboard links)
 */

import { GraphEngine } from '../engine';
import { createInitialWorkflowState, type WorkflowState } from '../schema';
import { issueProcessorWorkflow, type IssueContext } from '../workflows/issue-processor.workflow';
import { createNodeRuntimes } from './utils';

// ============================================================================
// CLI Arguments
// ============================================================================

interface CliArgs {
  issue?: number;
  owner?: string;
  repo?: string;
  baseBranch: string;
  stateDir: string;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    baseBranch: 'main',
    stateDir: '.graph-state',
    dryRun: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--issue':
      case '-i':
        if (nextArg && !nextArg.startsWith('-')) {
          result.issue = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--owner':
        if (nextArg && !nextArg.startsWith('-')) {
          result.owner = nextArg;
          i++;
        }
        break;
      case '--repo':
        if (nextArg && !nextArg.startsWith('-')) {
          result.repo = nextArg;
          i++;
        }
        break;
      case '--base-branch':
      case '-b':
        if (nextArg && !nextArg.startsWith('-')) {
          result.baseBranch = nextArg;
          i++;
        }
        break;
      case '--state-dir':
        if (nextArg && !nextArg.startsWith('-')) {
          result.stateDir = nextArg;
          i++;
        }
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
run-issue - Execute the issue processor workflow

DESCRIPTION
  Fetches a GitHub issue and runs it through the sys/graph issue processor
  workflow. The workflow analyzes the issue, plans tasks, implements changes,
  runs tests, creates a PR with live status visualization, and reports back.

USAGE
  bun run src/lib/graph/cli/run-issue.ts --issue <number> [options]

OPTIONS
  --issue, -i <number>   GitHub issue number (required)
  --owner <owner>        Repository owner (from GITHUB_REPOSITORY)
  --repo <repo>          Repository name (from GITHUB_REPOSITORY)
  --base-branch, -b <br> Target branch for PRs (default: main)
  --state-dir <dir>      State directory (default: .graph-state)
  --dry-run              Print workflow config without executing
  --verbose, -v          Enable verbose logging
  --help, -h             Show this help message

ENVIRONMENT VARIABLES
  GITHUB_TOKEN           GitHub personal access token (for gh CLI)
  GITHUB_REPOSITORY      Repository in owner/repo format
  ANTHROPIC_API_KEY      Anthropic API key for Claude
  GITHUB_RUN_ID          GitHub Actions run ID (for dashboard links)
  GITHUB_SERVER_URL      GitHub server URL (for dashboard links)

EXAMPLES
  # Run workflow for issue #123
  bun run src/lib/graph/cli/run-issue.ts --issue 123

  # With explicit repository and base branch
  bun run src/lib/graph/cli/run-issue.ts --issue 123 --owner my-org --repo my-repo --base-branch develop

  # Dry run to see configuration
  bun run src/lib/graph/cli/run-issue.ts --issue 123 --dry-run
`);
}

// ============================================================================
// GitHub CLI Integration
// ============================================================================

interface IssueData {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: string;
}

/**
 * Fetch issue data using the GitHub CLI (gh).
 * This avoids adding @octokit/rest as a dependency.
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

// ============================================================================
// Main
// ============================================================================

async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Validate required arguments
  if (args.issue === undefined || isNaN(args.issue)) {
    console.error('Error: --issue is required and must be a number');
    showHelp();
    process.exit(1);
  }

  // Get API key
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey && !args.dryRun) {
    console.error('Error: ANTHROPIC_API_KEY environment variable required');
    process.exit(1);
  }

  // Get owner/repo
  let owner = args.owner;
  let repo = args.repo;

  if ((!owner || !repo) && process.env['GITHUB_REPOSITORY']) {
    const parts = process.env['GITHUB_REPOSITORY'].split('/');
    if (parts.length === 2) {
      owner = owner ?? parts[0];
      repo = repo ?? parts[1];
    }
  }

  if (!owner || !repo) {
    console.error('Error: Repository owner and name required. Set GITHUB_REPOSITORY or use --owner/--repo');
    process.exit(1);
  }

  const repository = `${owner}/${repo}`;

  // Build GitHub Actions run URL if running in Actions
  const actionsRunUrl = process.env['GITHUB_RUN_ID'] && process.env['GITHUB_SERVER_URL']
    ? `${process.env['GITHUB_SERVER_URL']}/${repository}/actions/runs/${process.env['GITHUB_RUN_ID']}`
    : undefined;

  if (args.verbose) {
    console.log('Configuration:');
    console.log(`  Issue: #${args.issue}`);
    console.log(`  Repository: ${repository}`);
    console.log(`  Base Branch: ${args.baseBranch}`);
    console.log(`  State Dir: ${args.stateDir}`);
    console.log(`  Dry Run: ${args.dryRun}`);
    if (actionsRunUrl) {
      console.log(`  Actions URL: ${actionsRunUrl}`);
    }
  }

  // Fetch issue data using gh CLI
  console.log(`Fetching issue #${args.issue}...`);

  let issue: IssueData;
  try {
    issue = await fetchIssueWithGhCli(owner, repo, args.issue);
  } catch (error) {
    const err = error as Error;
    console.error(`Error fetching issue: ${err.message}`);
    process.exit(1);
  }

  if (args.verbose) {
    console.log('Issue Data:');
    console.log(`  Title: ${issue.title}`);
    console.log(`  State: ${issue.state}`);
    console.log(`  Labels: ${issue.labels.join(', ') || 'none'}`);
  }

  // Create initial state
  const workflow = issueProcessorWorkflow;
  const initialState = createInitialWorkflowState(workflow);

  // Populate context with issue data
  // Build context without undefined values for exactOptionalPropertyTypes
  const context: IssueContext = {
    ...initialState.context,
    issueNumber: issue.number,
    issueTitle: issue.title,
    issueBody: issue.body,
    repository,
    baseBranch: args.baseBranch,
  };
  // Add actionsRunUrl only if defined
  if (actionsRunUrl) {
    context.actionsRunUrl = actionsRunUrl;
  }

  // Create properly typed state
  const state: WorkflowState<IssueContext> = {
    currentNode: initialState.currentNode,
    status: initialState.status,
    updatedAt: initialState.updatedAt,
    conversationHistory: [],
    context,
  };

  if (args.dryRun) {
    console.log('\n=== DRY RUN ===');
    console.log('\nWorkflow ID:', workflow.id);
    console.log('\nNodes:', workflow.nodes.map((n) => n.name).join(' → '));
    console.log('\nInitial State:', JSON.stringify(state, null, 2));
    console.log('\n=== END DRY RUN ===');
    process.exit(0);
  }

  // Create node runtimes from workflow definition
  const nodes = createNodeRuntimes(workflow);

  // Create and run engine
  console.log('\nStarting workflow...');
  const engine = new GraphEngine({
    stateDir: args.stateDir,
    apiKey: apiKey!,
    nodes,
    maxRetries: 1,
  });

  try {
    // Set environment variable for REPORT node
    process.env['ISSUE_NUMBER'] = String(args.issue);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalState = await engine.run(`issue-${args.issue}`, state as any);

    console.log('\n=== WORKFLOW COMPLETE ===');
    console.log('Final Status:', finalState.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = finalState.context as any;
    console.log('Tasks Completed:', ctx.tasks?.filter((t: { completed: boolean }) => t.completed).length || 0);
    console.log('Total Tasks:', ctx.tasks?.length || 0);
  } catch (error) {
    const err = error as Error;
    console.error('\n=== WORKFLOW FAILED ===');
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Run if executed directly
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
