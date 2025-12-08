/**
 * @sys/graph - Configuration Loader
 *
 * Handles dynamic import, validation, and error reporting for atomic.config.ts.
 * Updated for v2 array-based workflow definitions.
 */

import type { WorkflowConfig, WorkflowState, NodeDef } from './schema';
import type { LoadedConfig } from './types';
import { ConfigValidationError } from './types';
import { END_NODE } from './enums';

/**
 * Options for loading a workflow config.
 */
export interface LoadConfigOptions {
  /**
   * Path to the config file (default: 'atomic.config.ts' in current directory)
   */
  configPath?: string;

  /**
   * Whether to validate static transitions (default: true).
   * Dynamic transitions (functions) can only be validated at runtime.
   */
  validateTransitions?: boolean;
}

/**
 * Default config file name.
 */
const DEFAULT_CONFIG_FILE = 'atomic.config.ts';

/**
 * Validates that all static transitions in a v2 config point to valid node names or 'END'.
 *
 * @param config - The workflow configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateTransitions<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
>(config: WorkflowConfig<TNodeNames, TContext>): string[] {
  const errors: string[] = [];
  const nodeNames = config.nodes.map((n) => n.name);
  const validNodeNames = new Set([...nodeNames, END_NODE]);

  for (const node of config.nodes) {
    const transition = node.then;

    // Static transitions can be validated at load time
    if (typeof transition === 'string') {
      if (!validNodeNames.has(transition)) {
        const availableNodes = Array.from(validNodeNames).join(', ');
        errors.push(
          `Node "${node.name}" has invalid transition target "${transition}". ` +
            `Valid targets are: ${availableNodes}`
        );
      }
    }
    // Dynamic transitions (functions) are validated at runtime when executed
    // We just verify it's actually a function here
    else if (typeof transition !== 'function') {
      errors.push(
        `Node "${node.name}" has invalid "then" property. ` +
          `Expected string or function, got ${typeof transition}`
      );
    }
  }

  return errors;
}

/**
 * Validates the overall structure and required properties of a v2 config.
 *
 * @param config - The raw config object to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateConfigSchema(config: unknown): string[] {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object');
    return errors;
  }

  const cfg = config as Record<string, unknown>;

  // Validate required 'id' property
  if (!cfg.id) {
    errors.push('Config must have an "id" property');
  } else if (typeof cfg.id !== 'string') {
    errors.push(`Config "id" must be a string, got ${typeof cfg.id}`);
  } else if (cfg.id.trim() === '') {
    errors.push('Config "id" cannot be empty');
  }

  // Validate required 'schema' property (v2 API)
  if (!cfg.schema) {
    errors.push('Config must have a "schema" property (use defineNodes() to create one)');
  }

  // Validate required 'nodes' property (v2 is array-based)
  if (!cfg.nodes) {
    errors.push('Config must have a "nodes" property');
  } else if (!Array.isArray(cfg.nodes)) {
    errors.push('Config "nodes" must be an array');
  } else {
    const nodes = cfg.nodes as unknown[];

    if (nodes.length === 0) {
      errors.push('Config must define at least one node');
    } else {
      // Validate each node
      for (let i = 0; i < nodes.length; i++) {
        const nodeErrors = validateNodeDefinition(i, nodes[i]);
        errors.push(...nodeErrors);
      }
    }
  }

  return errors;
}

/**
 * Validates a single v2 node definition.
 *
 * @param index - The index of the node in the array
 * @param node - The node definition to validate
 * @returns Array of validation error messages (empty if valid)
 */
function validateNodeDefinition(index: number, node: unknown): string[] {
  const errors: string[] = [];
  const location = `nodes[${index}]`;

  if (!node || typeof node !== 'object') {
    errors.push(`${location} must be an object`);
    return errors;
  }

  const n = node as Record<string, unknown>;

  // Validate required 'type' property
  if (!n.type) {
    errors.push(`${location} must have a "type" property`);
  } else if (typeof n.type !== 'string') {
    errors.push(`${location} type must be a string`);
  }

  // Validate required 'name' property (v2 uses name inside object)
  if (!n.name) {
    errors.push(`${location} must have a "name" property`);
  } else if (typeof n.name !== 'string') {
    errors.push(`${location} name must be a string`);
  }

  // Validate required 'then' property (v2 uses 'then' not 'next')
  if (n.then === undefined) {
    errors.push(`${location} must have a "then" property`);
  } else if (typeof n.then !== 'string' && typeof n.then !== 'function') {
    errors.push(
      `${location} "then" must be a string or function, got ${typeof n.then}`
    );
  }

  const nodeName = typeof n.name === 'string' ? n.name : `at index ${index}`;

  // Type-specific validation
  if (n.type === 'agent') {
    if (!n.role) {
      errors.push(`AgentNode "${nodeName}" must have a "role" property`);
    } else if (typeof n.role !== 'string') {
      errors.push(`AgentNode "${nodeName}" role must be a string`);
    }

    // v2 uses 'prompt' not 'system'
    if (!n.prompt) {
      errors.push(`AgentNode "${nodeName}" must have a "prompt" property`);
    } else if (typeof n.prompt !== 'string') {
      errors.push(`AgentNode "${nodeName}" prompt must be a string`);
    }

    // v2 uses 'capabilities' not 'tools'
    if (n.capabilities !== undefined && !Array.isArray(n.capabilities)) {
      errors.push(`AgentNode "${nodeName}" capabilities must be an array`);
    }
  }

  if (n.type === 'command') {
    if (!n.command) {
      errors.push(`CommandNode "${nodeName}" must have a "command" property`);
    } else if (typeof n.command !== 'string') {
      errors.push(`CommandNode "${nodeName}" command must be a string`);
    }
  }

  if (n.type === 'slash-command') {
    if (!n.command) {
      errors.push(`SlashCommandNode "${nodeName}" must have a "command" property`);
    } else if (typeof n.command !== 'string') {
      errors.push(`SlashCommandNode "${nodeName}" command must be a string`);
    }

    if (!n.args && n.args !== '') {
      errors.push(`SlashCommandNode "${nodeName}" must have an "args" property`);
    } else if (typeof n.args !== 'string') {
      errors.push(`SlashCommandNode "${nodeName}" args must be a string`);
    }
  }

  if (n.type === 'eval') {
    if (!n.update) {
      errors.push(`EvalNode "${nodeName}" must have an "update" property`);
    } else if (typeof n.update !== 'function') {
      errors.push(`EvalNode "${nodeName}" update must be a function`);
    }
  }

  return errors;
}

/**
 * Formats validation errors into a user-friendly error message.
 *
 * @param errors - Array of error messages
 * @param configPath - Path to the config file
 * @returns Formatted error message
 */
function formatValidationErrors(errors: string[], configPath: string): string {
  const header = `\n❌ Config validation failed for "${configPath}":\n`;
  const errorList = errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');
  const footer = '\n\nPlease fix the above errors and try again.';
  return header + errorList + footer;
}

/**
 * Loads and validates a v2 workflow configuration from a TypeScript file.
 *
 * This function:
 * 1. Dynamically imports the config file using Bun's import
 * 2. Validates the config schema (required properties, types)
 * 3. Validates all static transitions point to valid nodes or 'END'
 * 4. Returns the validated config with strong typing
 *
 * @param options - Loading options
 * @returns The loaded and validated configuration
 * @throws ConfigValidationError if validation fails
 *
 * @example
 * ```typescript
 * import { loadConfig } from '@sys/graph';
 *
 * try {
 *   const { config, validNodeNames } = await loadConfig({
 *     configPath: './atomic.config.ts'
 *   });
 *   console.log('Loaded workflow:', config.id);
 *   console.log('Nodes:', config.nodes.map(n => n.name));
 * } catch (error) {
 *   if (error instanceof ConfigValidationError) {
 *     console.error('Validation errors:', error.errors);
 *   }
 * }
 * ```
 */
export async function loadConfig<
  TNodeNames extends string = string,
  TContext extends Record<string, unknown> = Record<string, unknown>
>(
  options: LoadConfigOptions = {}
): Promise<LoadedConfig<TNodeNames, TContext>> {
  const configPath = options.configPath ?? DEFAULT_CONFIG_FILE;
  const validateTransitionsFlag = options.validateTransitions ?? true;

  // Resolve to absolute path
  const absolutePath = configPath.startsWith('/')
    ? configPath
    : `${process.cwd()}/${configPath}`;

  // Step 1: Dynamic import
  let configModule: { default?: unknown };
  try {
    configModule = await import(absolutePath);
  } catch (importError) {
    const error = importError as Error;
    if (error.message?.includes('Cannot find module') || error.message?.includes('ENOENT')) {
      throw new ConfigValidationError(
        `Config file not found: "${configPath}"`,
        [`Could not find config file at "${absolutePath}". ` +
          `Make sure the file exists and the path is correct.`]
      );
    }
    // Re-throw syntax errors with helpful context
    if (error.message?.includes('SyntaxError') || error.name === 'SyntaxError') {
      throw new ConfigValidationError(
        `Syntax error in config file: "${configPath}"`,
        [`The config file has a syntax error: ${error.message}`]
      );
    }
    throw new ConfigValidationError(
      `Failed to load config file: "${configPath}"`,
      [`Import error: ${error.message}`]
    );
  }

  // Step 2: Extract default export
  const rawConfig = configModule.default;
  if (!rawConfig) {
    throw new ConfigValidationError(
      `Config file must have a default export: "${configPath}"`,
      [`The config file at "${configPath}" does not export a default value. ` +
        `Use "export default defineWorkflow({ ... })" to export your config.`]
    );
  }

  // Step 3: Validate schema
  const schemaErrors = validateConfigSchema(rawConfig);
  if (schemaErrors.length > 0) {
    throw new ConfigValidationError(
      formatValidationErrors(schemaErrors, configPath),
      schemaErrors
    );
  }

  const config = rawConfig as WorkflowConfig<TNodeNames, TContext>;

  // Step 4: Validate transitions
  if (validateTransitionsFlag) {
    const transitionErrors = validateTransitions(config);
    if (transitionErrors.length > 0) {
      throw new ConfigValidationError(
        formatValidationErrors(transitionErrors, configPath),
        transitionErrors
      );
    }
  }

  // Step 5: Build result
  const nodeNames = config.nodes.map((n: NodeDef<TNodeNames, TContext>) => n.name);
  const validNodeNames = new Set([...nodeNames, END_NODE]);

  return {
    config,
    configPath: absolutePath,
    validNodeNames,
  };
}

/**
 * Validates a transition at runtime.
 * This is used by the engine to validate dynamic transitions during execution.
 *
 * @param transition - The transition value (result of calling the then function)
 * @param validNodeNames - Set of valid node names
 * @param currentNode - Name of the current node (for error messages)
 * @throws Error if the transition is invalid
 */
export function validateRuntimeTransition(
  transition: string,
  validNodeNames: Set<string>,
  currentNode: string
): void {
  if (typeof transition !== 'string') {
    throw new Error(
      `Node "${currentNode}" then() returned ${typeof transition}, expected string`
    );
  }
  if (!validNodeNames.has(transition)) {
    const available = Array.from(validNodeNames).join(', ');
    throw new Error(
      `Node "${currentNode}" then() returned invalid target "${transition}". ` +
        `Valid targets are: ${available}`
    );
  }
}

/**
 * Transition type for resolveTransition function.
 */
type TransitionFn<TContext extends Record<string, unknown>> =
  | string
  | ((state: WorkflowState<TContext>) => string);

/**
 * Resolves a transition to the next node name.
 * Handles both static (string) and dynamic (function) transitions.
 *
 * @param transition - The transition definition
 * @param state - Current workflow state (for dynamic transitions)
 * @param validNodeNames - Set of valid node names
 * @param currentNode - Name of the current node (for error messages)
 * @returns The resolved next node name
 * @throws Error if the transition is invalid
 */
export function resolveTransition<TContext extends Record<string, unknown>>(
  transition: TransitionFn<TContext>,
  state: WorkflowState<TContext>,
  validNodeNames: Set<string>,
  currentNode: string
): string {
  let nextNode: string;

  if (typeof transition === 'function') {
    // Dynamic transition - call the function with the state
    try {
      nextNode = transition(state);
    } catch (error) {
      const err = error as Error;
      throw new Error(
        `Node "${currentNode}" then() function threw an error: ${err.message}`
      );
    }
  } else {
    // Static transition
    nextNode = transition;
  }

  // Validate the result
  validateRuntimeTransition(nextNode, validNodeNames, currentNode);

  return nextNode;
}
