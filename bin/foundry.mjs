#!/usr/bin/env node
/**
 * Foundry CLI Entry Point
 *
 * Usage: foundry <command> [options]
 *
 * Commands:
 *   dispatch    Run the GitHub Issue DAG dispatcher
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

function showMainHelp() {
  console.log(`
foundry - CLI-based technical specification constructor

USAGE
  foundry <command> [options]

COMMANDS
  dispatch    Run the GitHub Issue DAG dispatcher
              Analyzes GitHub issues and generates execution matrix

OPTIONS
  --help, -h  Show this help message

EXAMPLES
  foundry dispatch --help
  foundry dispatch --owner iota-uz --repo foundry
`);
}

async function runDispatch(dispatchArgs) {
  // Use bun or tsx to run TypeScript directly
  const cliPath = path.join(__dirname, '..', 'src', 'lib', 'dispatch', 'cli.ts');
  
  // Try to use bun first, fall back to tsx
  const runners = ['bun', 'npx tsx'];
  
  for (const runner of runners) {
    try {
      const [cmd, ...cmdArgs] = runner.split(' ');
      const child = spawn(cmd, [...cmdArgs, cliPath, ...dispatchArgs], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      
      child.on('exit', (code) => {
        process.exit(code || 0);
      });
      
      child.on('error', () => {
        // Try next runner
      });
      
      // If we get here without error, we're running
      return;
    } catch {
      continue;
    }
  }
  
  console.error('Error: Could not find bun or tsx to run TypeScript.');
  console.error('Please install bun (https://bun.sh) or tsx (npm install -g tsx)');
  process.exit(1);
}

switch (command) {
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
