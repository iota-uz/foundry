#!/usr/bin/env bun
/**
 * Foundry CLI Entry Point
 *
 * This file can be run directly with bun:
 *   bun run src/cli/index.ts <command> [options]
 *
 * Commands:
 *   run       Execute atomic workflows
 *   graph     Run graph workflows (dispatch, issue-processor)
 */

import { main as runMain } from './run';
import { main as graphMain } from '../lib/graph/cli/run';

/**
 * Show main help message.
 */
function showMainHelp(): void {
  console.log(`
foundry - CLI-based technical specification constructor

USAGE
  foundry <command> [options]

COMMANDS
  run         Execute atomic workflows from configuration
              Loads atomic.config.ts and runs the workflow engine

  graph       Run graph workflows with config file
              Use: foundry graph <config-file> [--verbose]

OPTIONS
  --help, -h  Show this help message

EXAMPLES
  # Execute a workflow
  foundry run --config atomic.config.ts

  # Execute with context
  foundry run --context '{"issueId": 123}'

  # Validate config without executing
  foundry run --dry-run

  # Run dispatch workflow
  GRAPH_SOURCE=project GRAPH_PROJECT_NUMBER=14 foundry graph dispatch.config.ts

  # Run issue processor workflow
  GRAPH_ISSUE_NUMBER=123 foundry graph issue-processor.config.ts

For command-specific help:
  foundry run --help
  foundry graph --help
`);
}

/**
 * Main CLI entry point.
 */
export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const command = argv[0];
  const commandArgs = argv.slice(1);

  switch (command) {
    case 'run':
      await runMain(commandArgs);
      break;

    case 'graph':
      await graphMain(commandArgs);
      break;

    case '--help':
    case '-h':
    case undefined:
      showMainHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "foundry --help" for usage information.');
      process.exit(1);
  }
}

// Direct execution support
if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    const err = error as Error | undefined;
    console.error('Error:', err?.message ?? String(error));
    process.exit(1);
  });
}
