/**
 * CLI for the dispatch controller
 *
 * Usage: foundry dispatch [options]
 *
 * Options:
 *   --owner <owner>          Repository owner (required, or set GITHUB_REPOSITORY_OWNER)
 *   --repo <repo>            Repository name (required, or set GITHUB_REPOSITORY_NAME)
 *   --token <token>          GitHub token (required, or set GITHUB_TOKEN)
 *   --label <label>          Queue label (default: 'queue')
 *   --max-concurrent <n>     Maximum concurrent issues (default: unlimited)
 *   --output <file>          Output file for matrix JSON
 *   --dry-run                Dry run mode
 *   --verbose                Enable verbose logging
 *   --help                   Show help
 */

import { DispatchError, type DispatchConfig } from './types';
import {
  dispatch,
  formatResultSummary,
  writeMatrixToFile,
  setGitHubActionsOutput,
} from './dispatcher';

/**
 * CLI arguments parsed
 */
interface CliArgs {
  owner?: string;
  repo?: string;
  token?: string;
  label?: string;
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
      case '--label': {
        const value = getNextArg(i, '--label');
        if (value) {
          result.label = value;
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

  // Get owner/repo from args or environment
  let owner = args.owner ?? process.env['GITHUB_REPOSITORY_OWNER'];
  let repo = args.repo ?? process.env['GITHUB_REPOSITORY_NAME'];

  // Try to parse from GITHUB_REPOSITORY (owner/repo format)
  if ((!owner || !repo) && process.env['GITHUB_REPOSITORY']) {
    const parts = process.env['GITHUB_REPOSITORY'].split('/');
    if (parts.length === 2) {
      owner = owner ?? parts[0];
      repo = repo ?? parts[1];
    }
  }

  if (!owner) {
    throw new DispatchError(
      'Repository owner is required. Set GITHUB_REPOSITORY_OWNER or use --owner',
      'INVALID_CONFIG'
    );
  }

  if (!repo) {
    throw new DispatchError(
      'Repository name is required. Set GITHUB_REPOSITORY_NAME or use --repo',
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
  Analyzes GitHub issues with a specified label, builds a dependency graph (DAG),
  and generates a GitHub Actions matrix for parallel execution.

USAGE
  foundry dispatch [options]

OPTIONS
  --owner <owner>          Repository owner (or set GITHUB_REPOSITORY_OWNER)
  --repo <repo>            Repository name (or set GITHUB_REPOSITORY_NAME)
  --token <token>          GitHub token (or set GITHUB_TOKEN)
  --label <label>          Queue label to filter issues (default: 'queue')
  --max-concurrent <n>     Maximum concurrent issues in matrix
  --output, -o <file>      Output file for matrix JSON
  --dry-run                Run without side effects
  --verbose, -v            Enable verbose logging
  --help, -h               Show this help message

ENVIRONMENT VARIABLES
  GITHUB_TOKEN             GitHub personal access token
  GITHUB_REPOSITORY        Repository in owner/repo format
  GITHUB_REPOSITORY_OWNER  Repository owner
  GITHUB_REPOSITORY_NAME   Repository name
  GITHUB_API_URL           GitHub API URL (for GitHub Enterprise)

DEPENDENCY SYNTAX
  Issues can declare dependencies in their body using:
    - Depends on #123
    - Depends on owner/repo#123
    - Blocked by #456
    - Requires #789, #790

PRIORITY LABELS
  Issues can be prioritized using labels:
    - priority:critical (highest)
    - priority:high
    - priority:medium
    - priority:low

OUTPUT
  The command outputs a GitHub Actions matrix JSON to stdout and optionally
  to a file. The matrix can be used in workflow job strategy:

    jobs:
      dispatch:
        steps:
          - run: foundry dispatch --output matrix.json
          - id: set-matrix
            run: echo "matrix=$(cat matrix.json)" >> $GITHUB_OUTPUT
      
      process:
        needs: dispatch
        strategy:
          matrix: \${{ fromJson(needs.dispatch.outputs.matrix) }}

EXAMPLES
  # Basic usage with environment variables
  export GITHUB_TOKEN=ghp_xxx
  export GITHUB_REPOSITORY=owner/repo
  foundry dispatch

  # With explicit arguments
  foundry dispatch --owner iota-uz --repo foundry --token ghp_xxx

  # With max concurrent limit
  foundry dispatch --max-concurrent 5 --verbose

  # Output to file
  foundry dispatch -o matrix.json
`);
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
    const config = buildConfig(args);
    const result = await dispatch(config);

    // Print summary
    console.log(formatResultSummary(result));

    // Write to output file if specified
    if (config.outputFile) {
      await writeMatrixToFile(result.matrix, config.outputFile);
      console.log(`\nMatrix written to: ${config.outputFile}`);
    }

    // Set GitHub Actions output
    if (process.env['GITHUB_ACTIONS'] === 'true') {
      await setGitHubActionsOutput(result.matrix);
    }

    // Exit with error if no ready issues and not dry run
    if (result.readyIssues.length === 0 && !config.dryRun) {
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
