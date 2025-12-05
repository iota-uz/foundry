#!/usr/bin/env bun
/**
 * Foundry CLI Entry Point
 *
 * This file can be run directly with bun:
 *   bun run src/cli/index.ts <command> [options]
 *
 * Commands:
 *   run       Execute atomic workflows
 *   dispatch  Run the GitHub Issue DAG dispatcher
 */

import { main as runMain } from './run';
import { main as dispatchMain } from '../lib/dispatch/cli';

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

  dispatch    Run the GitHub Issue DAG dispatcher
              Analyzes GitHub issues and generates execution matrix

OPTIONS
  --help, -h  Show this help message

EXAMPLES
  # Execute a workflow
  foundry run --config atomic.config.ts

  # Execute with context
  foundry run --context '{"issueId": 123}'

  # Validate config without executing
  foundry run --dry-run

  # Run dispatcher
  foundry dispatch --owner iota-uz --repo foundry

For command-specific help:
  foundry run --help
  foundry dispatch --help
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

    case 'dispatch':
      await dispatchMain(commandArgs);
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
  main(process.argv.slice(2)).catch((error) => {
    console.error('Error:', error.message || error);
    process.exit(1);
  });
}
