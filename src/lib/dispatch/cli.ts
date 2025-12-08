/**
 * CLI for the dispatch controller
 *
 * Usage: foundry dispatch [options]
 *
 * Options:
 *   --owner <owner>          Repository owner (parsed from GITHUB_REPOSITORY)
 *   --repo <repo>            Repository name (parsed from GITHUB_REPOSITORY)
 *   --token <token>          GitHub token (or set GITHUB_TOKEN)
 *   --source <type>          Issue source type: 'label' or 'project' (default: 'label')
 *   --label <label>          Queue label for label source (default: 'queue')
 *   --project-owner <owner>  Project owner for project source
 *   --project-number <n>     Project number for project source
 *   --ready-status <status>  Status to filter by for project source (default: 'Ready')
 *   --in-progress <status>   Status to set when processing (default: 'In Progress')
 *   --max-concurrent <n>     Maximum concurrent issues (default: unlimited)
 *   --output <file>          Output file for matrix JSON
 *   --dry-run                Dry run mode
 *   --verbose                Enable verbose logging
 *   --help                   Show help
 */

import { DispatchError, type DispatchConfig } from './types';
import {
  formatResultSummary,
  writeMatrixToFile,
  setGitHubActionsOutput,
} from './dispatcher';
import {
  runDispatchWorkflow,
  type DispatchWorkflowConfig,
} from './dispatch-workflow';
import type { IssueSourceType } from '../graph/nodes/dispatch/fetch-issues-node';

/**
 * CLI arguments parsed
 */
interface CliArgs {
  owner?: string;
  repo?: string;
  token?: string;
  source?: IssueSourceType;
  label?: string;
  projectOwner?: string;
  projectNumber?: number;
  readyStatus?: string;
  inProgressStatus?: string;
  maxConcurrent?: number;
  output?: string;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

/**
 * Parse CLI arguments
 */
export function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    dryRun: false,
    verbose: false,
    help: false,
  };

  const getNextArg = (index: number, _flag: string): string | undefined => {
    const next = args[index + 1];
    if (next === undefined || next.startsWith('-')) {
      return undefined;
    }
    return next;
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--owner': {
        const value = getNextArg(i, '--owner');
        if (value) {
          result.owner = value;
          i++;
        }
        break;
      }
      case '--repo': {
        const value = getNextArg(i, '--repo');
        if (value) {
          result.repo = value;
          i++;
        }
        break;
      }
      case '--token': {
        const value = getNextArg(i, '--token');
        if (value) {
          result.token = value;
          i++;
        }
        break;
      }
      case '--source': {
        const value = getNextArg(i, '--source');
        if (value === 'label' || value === 'project') {
          result.source = value;
          i++;
        }
        break;
      }
      case '--label': {
        const value = getNextArg(i, '--label');
        if (value) {
          result.label = value;
          i++;
        }
        break;
      }
      case '--project-owner': {
        const value = getNextArg(i, '--project-owner');
        if (value) {
          result.projectOwner = value;
          i++;
        }
        break;
      }
      case '--project-number': {
        const value = getNextArg(i, '--project-number');
        if (value) {
          const num = parseInt(value, 10);
          if (!isNaN(num) && num > 0) {
            result.projectNumber = num;
          }
          i++;
        }
        break;
      }
      case '--ready-status': {
        const value = getNextArg(i, '--ready-status');
        if (value) {
          result.readyStatus = value;
          i++;
        }
        break;
      }
      case '--in-progress': {
        const value = getNextArg(i, '--in-progress');
        if (value) {
          result.inProgressStatus = value;
          i++;
        }
        break;
      }
      case '--max-concurrent': {
        const value = getNextArg(i, '--max-concurrent');
        if (value) {
          const maxConcurrent = parseInt(value, 10);
          if (!isNaN(maxConcurrent) && maxConcurrent > 0) {
            result.maxConcurrent = maxConcurrent;
          }
          i++;
        }
        break;
      }
      case '--output':
      case '-o': {
        const value = getNextArg(i, '--output');
        if (value) {
          result.output = value;
          i++;
        }
        break;
      }
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

/**
 * Build config from CLI args and environment variables
 */
export function buildConfig(args: CliArgs): DispatchConfig {
  // Get token from args or environment
  const token = args.token ?? process.env['GITHUB_TOKEN'];
  if (!token) {
    throw new DispatchError(
      'GitHub token is required. Set GITHUB_TOKEN or use --token',
      'INVALID_CONFIG'
    );
  }

  // Get owner/repo from GITHUB_REPOSITORY or CLI args
  let owner = args.owner;
  let repo = args.repo;

  // Parse from GITHUB_REPOSITORY (owner/repo format)
  if ((!owner || !repo) && process.env['GITHUB_REPOSITORY']) {
    const parts = process.env['GITHUB_REPOSITORY'].split('/');
    if (parts.length === 2) {
      owner = owner ?? parts[0];
      repo = repo ?? parts[1];
    }
  }

  if (!owner) {
    throw new DispatchError(
      'Repository owner is required. Set GITHUB_REPOSITORY or use --owner',
      'INVALID_CONFIG'
    );
  }

  if (!repo) {
    throw new DispatchError(
      'Repository name is required. Set GITHUB_REPOSITORY or use --repo',
      'INVALID_CONFIG'
    );
  }

  const config: DispatchConfig = {
    token,
    owner,
    repo,
    verbose: args.verbose,
    dryRun: args.dryRun,
  };

  if (args.label !== undefined) config.queueLabel = args.label;
  if (args.maxConcurrent !== undefined) config.maxConcurrent = args.maxConcurrent;
  if (args.output !== undefined) config.outputFile = args.output;

  return config;
}

/**
 * Show help message
 */
export function showHelp(): void {
  console.log(`
foundry dispatch - GitHub Issue DAG Dispatcher

DESCRIPTION
  Analyzes GitHub issues from various sources, builds a dependency graph (DAG),
  and generates a GitHub Actions matrix for parallel execution.

  Supports two source types:
  - 'label': Fetch issues by label (default)
  - 'project': Fetch issues from GitHub Projects V2 by status column

USAGE
  foundry dispatch [options]

OPTIONS
  --owner <owner>          Repository owner (parsed from GITHUB_REPOSITORY)
  --repo <repo>            Repository name (parsed from GITHUB_REPOSITORY)
  --token <token>          GitHub token (or set GITHUB_TOKEN)
  --source <type>          Issue source: 'label' or 'project' (default: 'label')
  --max-concurrent <n>     Maximum concurrent issues in matrix
  --output, -o <file>      Output file for matrix JSON
  --dry-run                Run without side effects
  --verbose, -v            Enable verbose logging
  --help, -h               Show this help message

LABEL SOURCE OPTIONS
  --label <label>          Queue label to filter issues (default: 'queue')

PROJECT SOURCE OPTIONS
  --project-owner <owner>  Project owner (defaults to --owner)
  --project-number <n>     Project number (visible in project URL)
  --ready-status <status>  Status to filter by (default: 'Ready')
  --in-progress <status>   Status to set when processing (default: 'In Progress')

ENVIRONMENT VARIABLES
  GITHUB_TOKEN             GitHub personal access token
  GITHUB_REPOSITORY        Repository in owner/repo format (auto-parsed)

DEPENDENCY HANDLING
  The dispatcher uses GitHub's sub-issues feature for dependency tracking.
  A parent issue is blocked until all its sub-issues are closed.

PRIORITY
  For 'label' source: Uses priority:* labels (critical, high, medium, low)
  For 'project' source: Uses the 'Priority' field from the project

OUTPUT
  The command outputs a GitHub Actions matrix JSON to stdout and optionally
  to a file. The matrix can be used in workflow job strategy.

EXAMPLES
  # Label-based dispatch (default)
  foundry dispatch --label queue

  # Project-based dispatch
  foundry dispatch --source project --project-owner iota-uz --project-number 14

  # Project dispatch with custom status
  foundry dispatch --source project --project-owner iota-uz --project-number 14 \\
    --ready-status "Ready" --in-progress "In Progress"

  # With max concurrent limit
  foundry dispatch --source project --project-number 14 --max-concurrent 5

  # Dry run (don't update status)
  foundry dispatch --source project --project-number 14 --dry-run --verbose
`);
}

/**
 * Build workflow config from CLI args
 */
function buildWorkflowConfig(args: CliArgs): DispatchWorkflowConfig {
  // Get token from args or environment
  const token = args.token ?? process.env['GITHUB_TOKEN'];
  if (!token) {
    throw new DispatchError(
      'GitHub token is required. Set GITHUB_TOKEN or use --token',
      'INVALID_CONFIG'
    );
  }

  // Get owner/repo from GITHUB_REPOSITORY or CLI args
  let owner = args.owner;
  let repo = args.repo;

  // Parse from GITHUB_REPOSITORY (owner/repo format)
  if ((!owner || !repo) && process.env['GITHUB_REPOSITORY']) {
    const parts = process.env['GITHUB_REPOSITORY'].split('/');
    if (parts.length === 2) {
      owner = owner ?? parts[0];
      repo = repo ?? parts[1];
    }
  }

  if (!owner) {
    throw new DispatchError(
      'Repository owner is required. Set GITHUB_REPOSITORY or use --owner',
      'INVALID_CONFIG'
    );
  }

  if (!repo) {
    throw new DispatchError(
      'Repository name is required. Set GITHUB_REPOSITORY or use --repo',
      'INVALID_CONFIG'
    );
  }

  const sourceType = args.source ?? 'label';

  // Validate project source config
  if (sourceType === 'project') {
    const projectOwner = args.projectOwner ?? owner;
    const projectNumber = args.projectNumber;

    if (!projectNumber) {
      throw new DispatchError(
        'Project number is required for project source. Use --project-number',
        'INVALID_CONFIG'
      );
    }

    const config: DispatchWorkflowConfig = {
      sourceType: 'project',
      token,
      owner,
      repo,
      projectOwner,
      projectNumber,
      verbose: args.verbose,
      dryRun: args.dryRun,
    };

    if (args.readyStatus !== undefined) config.readyStatus = args.readyStatus;
    if (args.inProgressStatus !== undefined) config.inProgressStatus = args.inProgressStatus;
    if (args.maxConcurrent !== undefined) config.maxConcurrent = args.maxConcurrent;

    return config;
  }

  // Label source config
  const config: DispatchWorkflowConfig = {
    sourceType: 'label',
    token,
    owner,
    repo,
    verbose: args.verbose,
    dryRun: args.dryRun,
  };

  if (args.label !== undefined) config.label = args.label;
  if (args.maxConcurrent !== undefined) config.maxConcurrent = args.maxConcurrent;

  return config;
}

/**
 * Main CLI entry point
 */
export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  try {
    // Use new workflow for all sources
    const workflowConfig = buildWorkflowConfig(args);
    const result = await runDispatchWorkflow(workflowConfig);

    // Print summary
    console.log(formatResultSummary(result));

    // Write to output file if specified
    if (args.output) {
      await writeMatrixToFile(result.matrix, args.output);
      console.log(`\nMatrix written to: ${args.output}`);
    }

    // Set GitHub Actions output
    if (process.env['GITHUB_ACTIONS'] === 'true') {
      await setGitHubActionsOutput(result.matrix);
    }

    // Exit with error if no ready issues and not dry run
    if (result.readyIssues.length === 0 && !args.dryRun) {
      console.log('\nNo issues ready for execution.');
      process.exit(0);
    }
  } catch (error) {
    if (error instanceof DispatchError) {
      console.error(`Error [${error.code}]: ${error.message}`);
      if (error.details && args.verbose) {
        console.error('Details:', JSON.stringify(error.details, null, 2));
      }
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Entry point guard removed - use CLI via bin script instead
