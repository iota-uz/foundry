/**
 * Workflow DSL Validation
 *
 * Validates DSL workflow definitions for correctness and completeness.
 */

import type { DSLWorkflow, DSLNode, TransitionDef } from './types';
import { getTransitionTargets, validateTransition } from './transitions';

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error with context
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Path to the error (e.g., 'nodes.PLAN.prompt') */
  path?: string;
  /** Severity level */
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the workflow is valid */
  valid: boolean;
  /** Validation errors and warnings */
  errors: ValidationError[];
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a complete DSL workflow definition
 */
export function validateDSL(workflow: DSLWorkflow): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate workflow metadata
  validateMetadata(workflow, errors);

  // Validate nodes
  validateNodes(workflow, errors);

  // Validate transitions
  validateTransitions(workflow, errors);

  // Validate graph structure
  validateGraphStructure(workflow, errors);

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

// ============================================================================
// Metadata Validation
// ============================================================================

function validateMetadata(workflow: DSLWorkflow, errors: ValidationError[]): void {
  // Validate ID
  if (!workflow.id || workflow.id.trim() === '') {
    errors.push({
      code: 'MISSING_ID',
      message: 'Workflow must have an id',
      path: 'id',
      severity: 'error',
    });
  } else if (!/^[a-z0-9][a-z0-9-_]*$/i.test(workflow.id)) {
    errors.push({
      code: 'INVALID_ID',
      message: 'Workflow id must start with alphanumeric and contain only letters, numbers, hyphens, and underscores',
      path: 'id',
      severity: 'warning',
    });
  }

  // Validate start node reference
  if (!workflow.start) {
    errors.push({
      code: 'MISSING_START',
      message: 'Workflow must specify a start node',
      path: 'start',
      severity: 'error',
    });
  } else if (!workflow.nodes[workflow.start]) {
    errors.push({
      code: 'INVALID_START',
      message: `Start node '${workflow.start}' does not exist`,
      path: 'start',
      severity: 'error',
    });
  }

  // Validate nodes exist
  if (!workflow.nodes || Object.keys(workflow.nodes).length === 0) {
    errors.push({
      code: 'NO_NODES',
      message: 'Workflow must have at least one node',
      path: 'nodes',
      severity: 'error',
    });
  }
}

// ============================================================================
// Node Validation
// ============================================================================

function validateNodes(workflow: DSLWorkflow, errors: ValidationError[]): void {
  for (const [nodeName, node] of Object.entries(workflow.nodes)) {
    validateNode(nodeName, node, errors);
  }
}

function validateNode(nodeName: string, node: DSLNode, errors: ValidationError[]): void {
  // Validate node name
  if (!/^[A-Z][A-Z0-9_]*$/i.test(nodeName)) {
    errors.push({
      code: 'INVALID_NODE_NAME',
      message: `Node name '${nodeName}' should be UPPER_SNAKE_CASE`,
      path: `nodes.${nodeName}`,
      severity: 'warning',
    });
  }

  // Validate by node type
  switch (node.type) {
    case 'trigger':
      validateTriggerNode(nodeName, node, errors);
      break;
    case 'agent':
      validateAgentNode(nodeName, node, errors);
      break;
    case 'command':
      validateCommandNode(nodeName, node, errors);
      break;
    case 'slash-command':
      validateSlashCommandNode(nodeName, node, errors);
      break;
    case 'eval':
      validateEvalNode(nodeName, node, errors);
      break;
    case 'http':
      validateHttpNode(nodeName, node, errors);
      break;
    case 'llm':
      validateLlmNode(nodeName, node, errors);
      break;
    case 'dynamic-agent':
      validateDynamicAgentNode(nodeName, node, errors);
      break;
    case 'dynamic-command':
      validateDynamicCommandNode(nodeName, node, errors);
      break;
    case 'github-project':
      validateGitHubProjectNode(nodeName, node, errors);
      break;
    case 'git-checkout':
      validateGitCheckoutNode(nodeName, node, errors);
      break;
    default:
      errors.push({
        code: 'UNKNOWN_NODE_TYPE',
        message: `Unknown node type: ${(node as { type: string }).type}`,
        path: `nodes.${nodeName}.type`,
        severity: 'error',
      });
  }
}

function validateTriggerNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'trigger' }>,
  errors: ValidationError[]
): void {
  // Trigger nodes are mostly empty, just validate custom fields if present
  if (node.customFields) {
    for (const field of node.customFields) {
      if (!field.id) {
        errors.push({
          code: 'MISSING_FIELD_ID',
          message: 'Custom field must have an id',
          path: `nodes.${nodeName}.customFields`,
          severity: 'error',
        });
      }
      if (!field.name) {
        errors.push({
          code: 'MISSING_FIELD_NAME',
          message: 'Custom field must have a name',
          path: `nodes.${nodeName}.customFields`,
          severity: 'error',
        });
      }
    }
  }
}

function validateAgentNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'agent' }>,
  errors: ValidationError[]
): void {
  if (!node.role || node.role.trim() === '') {
    errors.push({
      code: 'MISSING_ROLE',
      message: 'Agent node must have a role',
      path: `nodes.${nodeName}.role`,
      severity: 'error',
    });
  }

  if (!node.prompt || node.prompt.trim() === '') {
    errors.push({
      code: 'MISSING_PROMPT',
      message: 'Agent node must have a prompt',
      path: `nodes.${nodeName}.prompt`,
      severity: 'error',
    });
  }

  if (!node.model) {
    errors.push({
      code: 'MISSING_MODEL',
      message: 'Agent node must have a model',
      path: `nodes.${nodeName}.model`,
      severity: 'error',
    });
  } else if (!['haiku', 'sonnet', 'opus'].includes(node.model)) {
    errors.push({
      code: 'INVALID_MODEL',
      message: `Invalid model: ${node.model}. Must be haiku, sonnet, or opus`,
      path: `nodes.${nodeName}.model`,
      severity: 'error',
    });
  }

  if (node.maxTurns !== undefined && node.maxTurns < 1) {
    errors.push({
      code: 'INVALID_MAX_TURNS',
      message: 'maxTurns must be at least 1',
      path: `nodes.${nodeName}.maxTurns`,
      severity: 'error',
    });
  }

  if (node.temperature !== undefined && (node.temperature < 0 || node.temperature > 1)) {
    errors.push({
      code: 'INVALID_TEMPERATURE',
      message: 'temperature must be between 0 and 1',
      path: `nodes.${nodeName}.temperature`,
      severity: 'error',
    });
  }
}

function validateCommandNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'command' }>,
  errors: ValidationError[]
): void {
  if (!node.command || node.command.trim() === '') {
    errors.push({
      code: 'MISSING_COMMAND',
      message: 'Command node must have a command',
      path: `nodes.${nodeName}.command`,
      severity: 'error',
    });
  }

  if (node.timeout !== undefined && node.timeout < 0) {
    errors.push({
      code: 'INVALID_TIMEOUT',
      message: 'timeout must be non-negative',
      path: `nodes.${nodeName}.timeout`,
      severity: 'error',
    });
  }
}

function validateSlashCommandNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'slash-command' }>,
  errors: ValidationError[]
): void {
  if (!node.command || node.command.trim() === '') {
    errors.push({
      code: 'MISSING_COMMAND',
      message: 'Slash command node must have a command',
      path: `nodes.${nodeName}.command`,
      severity: 'error',
    });
  }
}

function validateEvalNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'eval' }>,
  errors: ValidationError[]
): void {
  if (!node.code || node.code.trim() === '') {
    errors.push({
      code: 'MISSING_CODE',
      message: 'Eval node must have code',
      path: `nodes.${nodeName}.code`,
      severity: 'error',
    });
  }
}

function validateHttpNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'http' }>,
  errors: ValidationError[]
): void {
  if (!node.url || node.url.trim() === '') {
    errors.push({
      code: 'MISSING_URL',
      message: 'HTTP node must have a url',
      path: `nodes.${nodeName}.url`,
      severity: 'error',
    });
  }

  if (!node.method) {
    errors.push({
      code: 'MISSING_METHOD',
      message: 'HTTP node must have a method',
      path: `nodes.${nodeName}.method`,
      severity: 'error',
    });
  } else if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(node.method)) {
    errors.push({
      code: 'INVALID_METHOD',
      message: `Invalid HTTP method: ${node.method}`,
      path: `nodes.${nodeName}.method`,
      severity: 'error',
    });
  }
}

function validateLlmNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'llm' }>,
  errors: ValidationError[]
): void {
  if (!node.prompt || node.prompt.trim() === '') {
    errors.push({
      code: 'MISSING_PROMPT',
      message: 'LLM node must have a prompt',
      path: `nodes.${nodeName}.prompt`,
      severity: 'error',
    });
  }

  if (!node.model) {
    errors.push({
      code: 'MISSING_MODEL',
      message: 'LLM node must have a model',
      path: `nodes.${nodeName}.model`,
      severity: 'error',
    });
  }
}

function validateDynamicAgentNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'dynamic-agent' }>,
  errors: ValidationError[]
): void {
  if (!node.modelExpression || node.modelExpression.trim() === '') {
    errors.push({
      code: 'MISSING_MODEL_EXPRESSION',
      message: 'Dynamic agent node must have a modelExpression',
      path: `nodes.${nodeName}.modelExpression`,
      severity: 'error',
    });
  }

  if (!node.promptExpression || node.promptExpression.trim() === '') {
    errors.push({
      code: 'MISSING_PROMPT_EXPRESSION',
      message: 'Dynamic agent node must have a promptExpression',
      path: `nodes.${nodeName}.promptExpression`,
      severity: 'error',
    });
  }
}

function validateDynamicCommandNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'dynamic-command' }>,
  errors: ValidationError[]
): void {
  if (!node.commandExpression || node.commandExpression.trim() === '') {
    errors.push({
      code: 'MISSING_COMMAND_EXPRESSION',
      message: 'Dynamic command node must have a commandExpression',
      path: `nodes.${nodeName}.commandExpression`,
      severity: 'error',
    });
  }
}

function validateGitHubProjectNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'github-project' }>,
  errors: ValidationError[]
): void {
  if (!node.token || node.token.trim() === '') {
    errors.push({
      code: 'MISSING_TOKEN',
      message: 'GitHub Project node must have a token',
      path: `nodes.${nodeName}.token`,
      severity: 'error',
    });
  }

  if (!node.projectOwner) {
    errors.push({
      code: 'MISSING_PROJECT_OWNER',
      message: 'GitHub Project node must have a projectOwner',
      path: `nodes.${nodeName}.projectOwner`,
      severity: 'error',
    });
  }

  if (node.projectNumber === undefined || node.projectNumber < 1) {
    errors.push({
      code: 'INVALID_PROJECT_NUMBER',
      message: 'GitHub Project node must have a valid projectNumber',
      path: `nodes.${nodeName}.projectNumber`,
      severity: 'error',
    });
  }
}

function validateGitCheckoutNode(
  nodeName: string,
  node: Extract<DSLNode, { type: 'git-checkout' }>,
  errors: ValidationError[]
): void {
  if (!node.useIssueContext) {
    if (!node.owner) {
      errors.push({
        code: 'MISSING_OWNER',
        message: 'Git checkout node must have owner when not using issue context',
        path: `nodes.${nodeName}.owner`,
        severity: 'error',
      });
    }
    if (!node.repo) {
      errors.push({
        code: 'MISSING_REPO',
        message: 'Git checkout node must have repo when not using issue context',
        path: `nodes.${nodeName}.repo`,
        severity: 'error',
      });
    }
  }

  if (!node.ref) {
    errors.push({
      code: 'MISSING_REF',
      message: 'Git checkout node must have a ref',
      path: `nodes.${nodeName}.ref`,
      severity: 'error',
    });
  }
}

// ============================================================================
// Transition Validation
// ============================================================================

function validateTransitions(workflow: DSLWorkflow, errors: ValidationError[]): void {
  // Build set of valid targets (node names + END)
  const validTargets = new Set<string>([...Object.keys(workflow.nodes), 'END']);

  for (const [nodeName, node] of Object.entries(workflow.nodes)) {
    const transition = extractTransitionDef(node);
    if (!transition) continue;

    const transitionErrors = validateTransition(transition, validTargets);
    for (const error of transitionErrors) {
      errors.push({
        code: 'INVALID_TRANSITION',
        message: error,
        path: `nodes.${nodeName}.then`,
        severity: 'error',
      });
    }
  }
}

/**
 * Extract TransitionDef from DSL node
 */
function extractTransitionDef(node: DSLNode): TransitionDef | null {
  const then = node.then;

  // String - simple transition
  if (typeof then === 'string') {
    return { type: 'simple', target: then };
  }

  // Object - conditional or switch
  if (typeof then === 'object' && then !== null) {
    const obj = then as Record<string, unknown>;

    // Conditional
    if ('if' in obj && 'then' in obj && 'else' in obj) {
      return {
        type: 'conditional',
        condition: obj.if as string,
        thenTarget: obj.then as string,
        elseTarget: obj.else as string,
      };
    }

    // Switch
    if ('match' in obj && 'cases' in obj) {
      return {
        type: 'switch',
        expression: obj.match as string,
        cases: obj.cases as Record<string, string>,
        defaultTarget: (obj.default as string) ?? 'END',
      };
    }
  }

  return null;
}

// ============================================================================
// Graph Structure Validation
// ============================================================================

function validateGraphStructure(workflow: DSLWorkflow, errors: ValidationError[]): void {
  const nodeNames = new Set(Object.keys(workflow.nodes));
  const reachable = new Set<string>();

  // BFS from start node
  const queue = [workflow.start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current) || current === 'END') continue;
    reachable.add(current);

    const node = workflow.nodes[current];
    if (!node) continue;

    const transition = extractTransitionDef(node);
    if (transition) {
      const targets = getTransitionTargets(transition);
      for (const target of targets) {
        if (!reachable.has(target) && target !== 'END') {
          queue.push(target);
        }
      }
    }
  }

  // Check for unreachable nodes
  for (const nodeName of nodeNames) {
    if (!reachable.has(nodeName) && nodeName !== workflow.start) {
      errors.push({
        code: 'UNREACHABLE_NODE',
        message: `Node '${nodeName}' is not reachable from the start node`,
        path: `nodes.${nodeName}`,
        severity: 'warning',
      });
    }
  }

  // Check for nodes without transitions (dead ends)
  for (const nodeName of nodeNames) {
    const node = workflow.nodes[nodeName];
    if (!node) continue;
    if (node.type === 'trigger') continue; // Triggers are entry points

    const then = node.then;
    if (!then || (typeof then === 'string' && then !== 'END')) continue;

    const transition = extractTransitionDef(node);
    if (!transition) {
      errors.push({
        code: 'MISSING_TRANSITION',
        message: `Node '${nodeName}' has no transition defined`,
        path: `nodes.${nodeName}.then`,
        severity: 'warning',
      });
    }
  }
}
