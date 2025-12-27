/**
 * Workflow DSL Transition Utilities
 *
 * Functions for serializing and parsing transition definitions.
 * Handles conversion between structured TransitionDef and DSL code.
 */

import type {
  TransitionDef,
  SimpleTransition,
  ConditionalTransition,
  SwitchTransition,
  FunctionTransition,
  DSLTransitionObject,
} from './types';

// ============================================================================
// Transition Detection
// ============================================================================

/**
 * Check if a value is a simple string transition
 */
export function isSimpleTransition(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if an object is a conditional transition
 */
export function isConditionalObject(obj: DSLTransitionObject): boolean {
  return 'if' in obj && 'then' in obj && 'else' in obj;
}

/**
 * Check if an object is a switch transition
 */
export function isSwitchObject(obj: DSLTransitionObject): boolean {
  return 'match' in obj && 'cases' in obj;
}

// ============================================================================
// Transition Parsing
// ============================================================================

/**
 * Parse a transition value from DSL into a TransitionDef
 */
export function parseTransition(
  value: string | DSLTransitionObject | undefined
): TransitionDef {
  // Default to END if no transition specified
  if (value === undefined) {
    return { type: 'simple', target: 'END' };
  }

  // Simple string transition
  if (typeof value === 'string') {
    return { type: 'simple', target: value };
  }

  // Conditional transition
  if (isConditionalObject(value)) {
    return {
      type: 'conditional',
      condition: value.if!,
      thenTarget: value.then!,
      elseTarget: value.else!,
    };
  }

  // Switch transition
  if (isSwitchObject(value)) {
    return {
      type: 'switch',
      expression: value.match!,
      cases: value.cases!,
      defaultTarget: value.default ?? 'END',
    };
  }

  // Unknown format, treat as simple to END
  return { type: 'simple', target: 'END' };
}

/**
 * Parse a transition from a function source string
 */
export function parseFunctionTransition(source: string): FunctionTransition {
  return {
    type: 'function',
    source: source.trim(),
  };
}

// ============================================================================
// Transition Serialization (to DSL code)
// ============================================================================

/**
 * Serialize a TransitionDef to DSL code string
 */
export function serializeTransition(transition: TransitionDef): string {
  switch (transition.type) {
    case 'simple':
      return `'${transition.target}'`;

    case 'conditional':
      return formatConditionalTransition(transition);

    case 'switch':
      return formatSwitchTransition(transition);

    case 'function':
      return transition.source;
  }
}

/**
 * Format a conditional transition as DSL object literal
 */
function formatConditionalTransition(t: ConditionalTransition): string {
  return `{
      if: '${escapeString(t.condition)}',
      then: '${t.thenTarget}',
      else: '${t.elseTarget}',
    }`;
}

/**
 * Format a switch transition as DSL object literal
 */
function formatSwitchTransition(t: SwitchTransition): string {
  const casesStr = Object.entries(t.cases)
    .map(([key, value]) => `        ${formatCaseKey(key)}: '${value}'`)
    .join(',\n');

  return `{
      match: '${escapeString(t.expression)}',
      cases: {
${casesStr}
      },
      default: '${t.defaultTarget}',
    }`;
}

/**
 * Format a case key (quote strings, leave numbers as-is)
 */
function formatCaseKey(key: string): string {
  // If it's a valid number, don't quote it
  if (!isNaN(Number(key))) {
    return key;
  }
  // Quote string keys
  return `'${escapeString(key)}'`;
}

/**
 * Escape special characters in strings
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ============================================================================
// Transition to Runtime Function
// ============================================================================

/**
 * Convert a TransitionDef to a runtime transition function string
 * Used by schema-converter to generate executable workflow config
 */
export function transitionToRuntimeFunction(transition: TransitionDef): string {
  switch (transition.type) {
    case 'simple':
      return `() => '${transition.target}'`;

    case 'conditional':
      return `(state) => state.${transition.condition} ? '${transition.thenTarget}' : '${transition.elseTarget}'`;

    case 'switch':
      return generateSwitchFunction(transition);

    case 'function':
      return transition.source;
  }
}

/**
 * Generate a switch statement function
 */
function generateSwitchFunction(t: SwitchTransition): string {
  const cases = Object.entries(t.cases)
    .map(([value, target]) => `    case ${formatCaseValue(value)}: return '${target}';`)
    .join('\n');

  return `(state) => {
  switch (state.${t.expression}) {
${cases}
    default: return '${t.defaultTarget}';
  }
}`;
}

/**
 * Format a case value for switch statement
 */
function formatCaseValue(value: string): string {
  // If it's a valid number, don't quote it
  if (!isNaN(Number(value))) {
    return value;
  }
  // Quote string values
  return `'${escapeString(value)}'`;
}

// ============================================================================
// Transition Validation
// ============================================================================

/**
 * Validate a transition definition
 */
export function validateTransition(
  transition: TransitionDef,
  validTargets: Set<string>
): string[] {
  const errors: string[] = [];

  switch (transition.type) {
    case 'simple':
      if (!validTargets.has(transition.target)) {
        errors.push(`Unknown transition target: ${transition.target}`);
      }
      break;

    case 'conditional':
      if (!validTargets.has(transition.thenTarget)) {
        errors.push(`Unknown transition target: ${transition.thenTarget}`);
      }
      if (!validTargets.has(transition.elseTarget)) {
        errors.push(`Unknown transition target: ${transition.elseTarget}`);
      }
      if (!transition.condition) {
        errors.push('Conditional transition missing condition');
      }
      break;

    case 'switch':
      for (const target of Object.values(transition.cases)) {
        if (!validTargets.has(target)) {
          errors.push(`Unknown transition target: ${target}`);
        }
      }
      if (!validTargets.has(transition.defaultTarget)) {
        errors.push(`Unknown default target: ${transition.defaultTarget}`);
      }
      if (!transition.expression) {
        errors.push('Switch transition missing expression');
      }
      break;

    case 'function':
      // Can't validate function targets statically
      if (!transition.source) {
        errors.push('Function transition missing source');
      }
      break;
  }

  return errors;
}

// ============================================================================
// Transition Helpers
// ============================================================================

/**
 * Get all possible targets from a transition
 * Used for edge generation and validation
 */
export function getTransitionTargets(transition: TransitionDef): string[] {
  switch (transition.type) {
    case 'simple':
      return [transition.target];

    case 'conditional':
      return [transition.thenTarget, transition.elseTarget];

    case 'switch':
      return [...Object.values(transition.cases), transition.defaultTarget];

    case 'function':
      // Can't determine targets statically for function transitions
      return [];
  }
}

/**
 * Check if a transition is dynamic (conditional, switch, or function)
 */
export function isDynamicTransition(transition: TransitionDef): boolean {
  return transition.type !== 'simple';
}

/**
 * Create a simple transition
 */
export function simpleTransition(target: string): SimpleTransition {
  return { type: 'simple', target };
}

/**
 * Create a conditional transition
 */
export function conditionalTransition(
  condition: string,
  thenTarget: string,
  elseTarget: string
): ConditionalTransition {
  return { type: 'conditional', condition, thenTarget, elseTarget };
}

/**
 * Create a switch transition
 */
export function switchTransition(
  expression: string,
  cases: Record<string, string>,
  defaultTarget: string
): SwitchTransition {
  return { type: 'switch', expression, cases, defaultTarget };
}

/**
 * Create a function transition
 */
export function functionTransition(source: string): FunctionTransition {
  return { type: 'function', source };
}
