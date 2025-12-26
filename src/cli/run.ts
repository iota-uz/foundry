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
  createInitialWorkflowState,
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
        if (value !== undefined && value !== '') {
          result.configPath = value;
          i++;
        }
        break;
      }
      case '--context': {
        const value = getNextArg(i);
        if (value !== undefined && value !== '') {
          result.context = value;
          i++;
        }
        break;
      }
      case '--state-dir': {
        const value = getNextArg(i);
        if (value !== undefined && value !== '') {
          result.stateDir = value;
          i++;
        }
        break;
      }
      case '--api-key': {
        const value = getNextArg(i);
        if (value !== undefined && value !== '') {
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
  if ((apiKey === undefined || apiKey === '') && !args.dryRun) {
    throw new CliError(
      'Anthropic API key is required. Set ANTHROPIC_API_KEY or use --api-key',
      'MISSING_API_KEY'
    );
  }

  // Parse context JSON if provided
  let context: Record<string, unknown> | undefined;
  if (args.context !== undefined && args.context !== '') {
    try {
      const parsed: unknown = JSON.parse(args.context);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Context must be a JSON object');
      }
      context = parsed as Record<string, unknown>;
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

import type { GraphNode, WorkflowState } from '../lib/graph';

/**
 * Workflow execution state returned by executeWorkflow.
 * Alias for WorkflowState with generic context.
 */
type WorkflowExecutionState = WorkflowState<Record<string, unknown>>;

/**
 * Execute a workflow from configuration.
 *
 * @param config - Run configuration
 * @returns Promise that resolves when workflow completes
 */
export async function executeWorkflow(config: RunConfig): Promise<WorkflowExecutionState> {
  const log = config.verbose ? console.log.bind(console) : (): void => { /* noop */ };

  // Step 1: Load and validate config
  log(`Loading config from: ${config.configPath}`);

  const { config: workflowConfig, validNodeNames } = await loadConfig({
    configPath: config.configPath,
    validateTransitions: true,
  });

  const nodeNames = workflowConfig.nodes.map((n) => n.name);
  log(`Loaded workflow: ${workflowConfig.id}`);
  log(`Nodes: ${nodeNames.join(', ')}`);
  log(`Valid transitions: ${Array.from(validNodeNames).join(', ')}`);

  // Step 2: If dry run, stop here
  if (config.dryRun) {
    console.log('\n✅ Config validation passed (dry run mode)\n');
    console.log('Workflow summary:');
    console.log(`  ID: ${workflowConfig.id}`);
    console.log(`  Nodes: ${workflowConfig.nodes.length}`);
    for (const node of workflowConfig.nodes) {
      console.log(`    - ${node.name} (${node.type})`);
    }

    // Return a placeholder state for dry run
    if (workflowConfig.nodes.length === 0) {
      throw new CliError('No nodes defined in workflow config', 'EMPTY_WORKFLOW');
    }
    // Create an initial state from the workflow config
    const mergedInitialContext = {
      ...(workflowConfig.initialContext ?? {}),
      ...(config.context ?? {}),
    };
    const dryRunConfig = {
      ...workflowConfig,
      initialContext: mergedInitialContext,
    };
    return createInitialWorkflowState(dryRunConfig);
  }

  // Step 3: Validate nodes exist
  if (workflowConfig.nodes.length === 0) {
    throw new CliError('No nodes defined in workflow config', 'EMPTY_WORKFLOW');
  }

  // Step 4: Create initial state with merged context
  const mergedContext = {
    ...(workflowConfig.initialContext ?? {}),
    ...(config.context ?? {}),
  };
  const configWithMergedContext = {
    ...workflowConfig,
    initialContext: mergedContext,
  };
  const initialState = createInitialWorkflowState(configWithMergedContext);

  // Step 5: Create and run engine
  // For now, we'll dynamically import to avoid issues in tests
  const { GraphEngine } = await import('../lib/graph/engine');
  const { createGraphNodes } = await import('./utils');

  const graphNodes = createGraphNodes(workflowConfig);

  // Create engine with the proper state type
  // The state type is compatible with BaseState required by GraphEngine
  const engine = new GraphEngine<WorkflowExecutionState>({
    stateDir: config.stateDir,
    nodes: graphNodes as Record<string, GraphNode<WorkflowExecutionState>>,
    apiKey: config.apiKey,
  });

  log(`Starting workflow from node: ${initialState.currentNode}`);

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
      if (error.details !== undefined && args.verbose === true) {
        console.error('Details:', JSON.stringify(error.details, null, 2));
      }
    } else if (error instanceof ConfigValidationError) {
      console.error(error.message);
      if (args.verbose === true) {
        console.error('Errors:', error.errors);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}
