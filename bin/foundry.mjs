#!/usr/bin/env node
/**
 * Foundry CLI Entry Point
 *
 * Usage: foundry <command> [options]
 *
 * Commands:
 *   run         Execute atomic workflows
 *   dispatch    Run the GitHub Issue DAG dispatcher
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

function showMainHelp() {
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

  # Run dispatcher
  foundry dispatch --owner iota-uz --repo foundry

For command-specific help:
  foundry run --help
  foundry dispatch --help
`);
}

/**
 * Run a TypeScript CLI script using bun or tsx
 * @param {string} scriptPath - Path to the TypeScript file
 * @param {string[]} scriptArgs - Arguments to pass to the script
 */
async function runTypescriptCli(scriptPath, scriptArgs) {
  // Try to use bun first, fall back to tsx
  const runners = ['bun', 'npx tsx'];
  let lastError = null;
  
  for (const runner of runners) {
    try {
      const [cmd, ...cmdArgs] = runner.split(' ');
      const child = spawn(cmd, [...cmdArgs, scriptPath, ...scriptArgs], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      
      child.on('exit', (code) => {
        process.exit(code || 0);
      });
      
      child.on('error', (err) => {
        // Error spawning process - this runner is not available.
        // Store error and try next runner in the loop.
        lastError = err;
      });
      
      // If we get here without error, we're running
      return;
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  
  console.error('Error: Could not find bun or tsx to run TypeScript.');
  console.error('Please install bun (https://bun.sh) or tsx (npm install -g tsx)');
  if (lastError) {
    console.error('Last error:', lastError.message || lastError);
  }
  process.exit(1);
}

async function runRun(runArgs) {
  const cliPath = path.join(__dirname, '..', 'src', 'cli', 'run-entry.ts');
  await runTypescriptCli(cliPath, runArgs);
}

async function runDispatch(dispatchArgs) {
  const cliPath = path.join(__dirname, '..', 'src', 'lib', 'dispatch', 'cli-entry.ts');
  await runTypescriptCli(cliPath, dispatchArgs);
}

switch (command) {
  case 'run':
    runRun(args.slice(1));
    break;

  case 'dispatch':
    runDispatch(args.slice(1));
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
