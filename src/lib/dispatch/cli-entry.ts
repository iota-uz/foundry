#!/usr/bin/env bun
/**
 * Dispatch CLI Entry Point
 *
 * This file can be run directly with bun:
 *   bun run src/lib/dispatch/cli-entry.ts
 */

import { main } from './cli';

main(process.argv.slice(2)).catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
