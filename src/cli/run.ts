/**
 * CLI for running atomic workflows
 *
 * Usage: foundry run [options]
 *
 * Options:
 *   --config <path>          Path to workflow config file (default: atomic.config.ts)
 *   --context <json>         Initial context as JSON string
 *   --state-dir <path>       Directory for state files (default: .ci)
 *   --api-key <key>          Anthropic API key (or set ANTHROPIC_API_KEY)
 *   --dry-run                Validate config without executing
 *   --verbose                Enable verbose logging
 *   --help                   Show help
 */

import type { RunConfig } from './types';
import { CliError } from './types';
import {
  loadConfig,
  createInitialState,
  type WorkflowState,
  ConfigValidationError,
} from '../lib/graph';

/**
 * CLI arguments parsed for the run command.
 */
export interface RunCliArgs {
  configPath?: string;
  context?: string;
  stateDir?: string;
  apiKey?: string;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

/**
 * Parse CLI arguments for the run command.
 */
export function parseArgs(args: string[]): RunCliArgs {
  const result: RunCliArgs = {
    dryRun: false,
    verbose: false,
    help: false,
  };

  const getNextArg = (index: number): string | undefined => {
    const next = args[index + 1];
    if (next === undefined || next.startsWith('-')) {
      return undefined;
    }
    return next;
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--config':
      case '-c': {
        const value = getNextArg(i);
        if (value) {
          result.configPath = value;
          i++;
        }
        break;
      }
      case '--context': {
        const value = getNextArg(i);
        if (value) {
          result.context = value;
          i++;
        }
        break;
      }
      case '--state-dir': {
        const value = getNextArg(i);
        if (value) {
          result.stateDir = value;
          i++;
        }
        break;
      }
      case '--api-key': {
        const value = getNextArg(i);
        if (value) {
          result.apiKey = value;
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
 * Build run config from CLI args and environment variables.
 */
export function buildConfig(args: RunCliArgs): RunConfig {
  // Get API key from args or environment
  const apiKey = args.apiKey ?? process.env['ANTHROPIC_API_KEY'];
  if (!apiKey && !args.dryRun) {
    throw new CliError(
      'Anthropic API key is required. Set ANTHROPIC_API_KEY or use --api-key',
      'MISSING_API_KEY'
    );
  }

  // Parse context JSON if provided
  let context: Record<string, unknown> | undefined;
  if (args.context) {
    try {
      context = JSON.parse(args.context);
      if (typeof context !== 'object' || context === null || Array.isArray(context)) {
        throw new Error('Context must be a JSON object');
      }
    } catch (error) {
      const err = error as Error;
      throw new CliError(
        `Invalid context JSON: ${err.message}`,
        'INVALID_CONTEXT',
        { context: args.context }
      );
    }
  }

  return {
    configPath: args.configPath ?? 'atomic.config.ts',
    context,
    stateDir: args.stateDir ?? '.ci',
    apiKey: apiKey ?? '',
    verbose: args.verbose,
    dryRun: args.dryRun,
  };
}

/**
 * Show help message for the run command.
 */
export function showHelp(): void {
  console.log(`
foundry run - Execute Atomic Workflows

DESCRIPTION
  Loads and executes atomic workflows defined in a TypeScript configuration file.
  Supports resumability through state persistence and checkpoint recovery.

USAGE
  foundry run [options]

OPTIONS
  --config, -c <path>     Path to workflow config file (default: atomic.config.ts)
  --context <json>        Initial context as JSON string (e.g., '{"issueId": 123}')
  --state-dir <path>      Directory for state files (default: .ci)
  --api-key <key>         Anthropic API key (or set ANTHROPIC_API_KEY)
  --dry-run               Validate config without executing
  --verbose, -v           Enable verbose logging
  --help, -h              Show this help message

ENVIRONMENT VARIABLES
  ANTHROPIC_API_KEY       Anthropic API key for Claude SDK

WORKFLOW CONFIGURATION
  The config file (atomic.config.ts) defines a workflow with:
  - id: Unique workflow identifier
  - nodes: FSM nodes (AgentNode, CommandNode, ClaudeCodeNode)
  - initialState: Initial context values

RESUMABILITY
  Workflow state is persisted to <state-dir>/state.json after each node.
  If execution is interrupted, re-running the same command will resume
  from the last checkpoint.

EXAMPLES
  # Run with default config
  foundry run

  # Run with custom config and context
  foundry run --config my-workflow.ts --context '{"issueId": 123}'

  # Validate config without executing
  foundry run --dry-run --verbose

  # Run with explicit API key
  foundry run --api-key sk-xxx
`);
}

/**
 * Execute a workflow from configuration.
 *
 * @param config - Run configuration
 * @returns Promise that resolves when workflow completes
 */
export async function executeWorkflow(config: RunConfig): Promise<WorkflowState<Record<string, unknown>>> {
  const log = config.verbose ? console.log.bind(console) : () => {};

  // Step 1: Load and validate config
  log(`Loading config from: ${config.configPath}`);

  const { config: workflowConfig, validNodeNames } = await loadConfig({
    configPath: config.configPath,
    validateTransitions: true,
  });

  log(`Loaded workflow: ${workflowConfig.id}`);
  log(`Nodes: ${Object.keys(workflowConfig.nodes).join(', ')}`);
  log(`Valid transitions: ${Array.from(validNodeNames).join(', ')}`);

  // Step 2: If dry run, stop here
  if (config.dryRun) {
    console.log('\n✅ Config validation passed (dry run mode)\n');
    console.log('Workflow summary:');
    console.log(`  ID: ${workflowConfig.id}`);
    console.log(`  Nodes: ${Object.keys(workflowConfig.nodes).length}`);
    for (const [name, node] of Object.entries(workflowConfig.nodes)) {
      console.log(`    - ${name} (${node.type})`);
    }

    // Return a placeholder state for dry run
    const firstNode = Object.keys(workflowConfig.nodes)[0];
    if (!firstNode) {
      throw new CliError('No nodes defined in workflow config', 'EMPTY_WORKFLOW');
    }
    return createInitialState(firstNode, config.context ?? undefined);
  }

  // Step 3: Determine starting node
  const nodeNames = Object.keys(workflowConfig.nodes);
  const startNode = nodeNames[0];

  if (!startNode) {
    throw new CliError('No nodes defined in workflow config', 'EMPTY_WORKFLOW');
  }

  // Step 4: Create initial state
  const mergedContext = {
    ...(workflowConfig.initialState?.context ?? {}),
    ...(config.context ?? {}),
  };

  const initialState = createInitialState(startNode, mergedContext);

  // Step 5: Create and run engine
  // For now, we'll dynamically import to avoid issues in tests
  const { GraphEngine } = await import('../lib/graph/engine');
  const { createGraphNodes } = await import('./utils');

  const graphNodes = createGraphNodes(workflowConfig);

  const engine = new GraphEngine<WorkflowState<Record<string, unknown>>>({
    stateDir: config.stateDir,
    nodes: graphNodes,
    apiKey: config.apiKey,
  });

  log(`Starting workflow from node: ${startNode}`);

  // Execute the workflow
  const finalState = await engine.run(workflowConfig.id, initialState);

  console.log(`\n✅ Workflow completed: ${workflowConfig.id}`);
  console.log(`Final status: ${finalState.status}`);
  console.log(`Final node: ${finalState.currentNode}`);

  return finalState;
}

/**
 * Main CLI entry point for the run command.
 */
export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  try {
    const config = buildConfig(args);
    await executeWorkflow(config);
  } catch (error) {
    if (error instanceof CliError) {
      console.error(`Error [${error.code}]: ${error.message}`);
      if (error.details && args.verbose) {
        console.error('Details:', JSON.stringify(error.details, null, 2));
      }
    } else if (error instanceof ConfigValidationError) {
      console.error(error.message);
      if (args.verbose) {
        console.error('Errors:', error.errors);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}
