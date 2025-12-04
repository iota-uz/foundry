/**
 * @sys/graph - Configuration Loader
 *
 * Handles dynamic import, validation, and error reporting for atomic.config.ts.
 * Validates that all declared node transitions point to valid nodes or 'END'.
 */

import type {
  WorkflowConfig,
  LoadedConfig,
  Transition,
} from './types';
import { ConfigValidationError } from './types';

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
 * Validates that all static transitions in a config point to valid node names or 'END'.
 *
 * @param config - The workflow configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateTransitions<TContext extends Record<string, unknown>>(
  config: WorkflowConfig<TContext>
): string[] {
  const errors: string[] = [];
  const validNodeNames = new Set([...Object.keys(config.nodes), 'END']);

  for (const [nodeName, node] of Object.entries(config.nodes)) {
    const transition = node.next;

    // Static transitions can be validated at load time
    if (typeof transition === 'string') {
      if (!validNodeNames.has(transition)) {
        const availableNodes = Array.from(validNodeNames).join(', ');
        errors.push(
          `Node "${nodeName}" has invalid transition target "${transition}". ` +
            `Valid targets are: ${availableNodes}`
        );
      }
    }
    // Dynamic transitions (functions) are validated at runtime when executed
    // We just verify it's actually a function here
    else if (typeof transition !== 'function') {
      errors.push(
        `Node "${nodeName}" has invalid "next" property. ` +
          `Expected string or function, got ${typeof transition}`
      );
    }
  }

  return errors;
}

/**
 * Validates the overall structure and required properties of a config.
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

  // Validate required 'nodes' property
  if (!cfg.nodes) {
    errors.push('Config must have a "nodes" property');
  } else if (typeof cfg.nodes !== 'object' || Array.isArray(cfg.nodes)) {
    errors.push('Config "nodes" must be an object');
  } else {
    const nodes = cfg.nodes as Record<string, unknown>;
    const nodeNames = Object.keys(nodes);

    if (nodeNames.length === 0) {
      errors.push('Config must define at least one node');
    } else {
      // Validate each node
      for (const [nodeName, node] of Object.entries(nodes)) {
        const nodeErrors = validateNodeDefinition(nodeName, node);
        errors.push(...nodeErrors);
      }
    }
  }

  return errors;
}

/**
 * Validates a single node definition.
 *
 * @param nodeName - The name of the node
 * @param node - The node definition to validate
 * @returns Array of validation error messages (empty if valid)
 */
function validateNodeDefinition(nodeName: string, node: unknown): string[] {
  const errors: string[] = [];

  if (!node || typeof node !== 'object') {
    errors.push(`Node "${nodeName}" must be an object`);
    return errors;
  }

  const n = node as Record<string, unknown>;

  // Validate required 'type' property
  if (!n.type) {
    errors.push(`Node "${nodeName}" must have a "type" property`);
  } else if (typeof n.type !== 'string') {
    errors.push(`Node "${nodeName}" type must be a string`);
  } else if (!['agent', 'command'].includes(n.type)) {
    errors.push(
      `Node "${nodeName}" has unknown type "${n.type}". ` +
        `Valid types are: agent, command`
    );
  }

  // Validate required 'next' property
  if (n.next === undefined) {
    errors.push(`Node "${nodeName}" must have a "next" property`);
  } else if (typeof n.next !== 'string' && typeof n.next !== 'function') {
    errors.push(
      `Node "${nodeName}" "next" must be a string or function, got ${typeof n.next}`
    );
  }

  // Type-specific validation
  if (n.type === 'agent') {
    if (!n.role) {
      errors.push(`AgentNode "${nodeName}" must have a "role" property`);
    } else if (typeof n.role !== 'string') {
      errors.push(`AgentNode "${nodeName}" role must be a string`);
    }

    if (!n.system) {
      errors.push(`AgentNode "${nodeName}" must have a "system" property`);
    } else if (typeof n.system !== 'string') {
      errors.push(`AgentNode "${nodeName}" system must be a string`);
    }

    // Tools validation (optional but must be array if present)
    if (n.tools !== undefined && !Array.isArray(n.tools)) {
      errors.push(`AgentNode "${nodeName}" tools must be an array`);
    }
  }

  if (n.type === 'command') {
    if (!n.command) {
      errors.push(`CommandNode "${nodeName}" must have a "command" property`);
    } else if (typeof n.command !== 'string') {
      errors.push(`CommandNode "${nodeName}" command must be a string`);
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
 * Loads and validates a workflow configuration from a TypeScript file.
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
 *   console.log('Nodes:', Object.keys(config.nodes));
 * } catch (error) {
 *   if (error instanceof ConfigValidationError) {
 *     console.error('Validation errors:', error.errors);
 *   }
 * }
 * ```
 */
export async function loadConfig<TContext extends Record<string, unknown> = Record<string, unknown>>(
  options: LoadConfigOptions = {}
): Promise<LoadedConfig<TContext>> {
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

  const config = rawConfig as WorkflowConfig<TContext>;

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
  const validNodeNames = new Set([...Object.keys(config.nodes), 'END']);

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
 * @param transition - The transition value (result of calling the next function)
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
      `Node "${currentNode}" next() returned ${typeof transition}, expected string`
    );
  }
  if (!validNodeNames.has(transition)) {
    const available = Array.from(validNodeNames).join(', ');
    throw new Error(
      `Node "${currentNode}" next() returned invalid target "${transition}". ` +
        `Valid targets are: ${available}`
    );
  }
}

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
  transition: Transition<TContext>,
  state: { context: TContext },
  validNodeNames: Set<string>,
  currentNode: string
): string {
  let nextNode: string;

  if (typeof transition === 'function') {
    // Dynamic transition - call the function with the state
    try {
      nextNode = transition(state as Parameters<typeof transition>[0]);
    } catch (error) {
      const err = error as Error;
      throw new Error(
        `Node "${currentNode}" next() function threw an error: ${err.message}`
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
