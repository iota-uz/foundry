#!/usr/bin/env bun
/**
 * Run CLI Entry Point
 *
 * This file can be run directly with bun:
 *   bun run src/cli/run-entry.ts [options]
 */

import { main } from './run';

main(process.argv.slice(2)).catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
