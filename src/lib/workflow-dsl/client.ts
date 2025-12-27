/**
 * Workflow DSL - Client-Safe Entry Point
 *
 * This module exports only client-safe functions that don't require Node.js built-in modules.
 * Use this for browser-side imports instead of the main index.ts.
 *
 * The parser (parseDSL, dslToReactFlow) uses ts-morph which requires Node.js fs module,
 * so parsing must be done server-side via API endpoints.
 *
 * @example
 * ```typescript
 * // Client-side (components)
 * import { generateDSL, validateDSL } from '@/lib/workflow-dsl/client';
 *
 * // Server-side (API routes)
 * import { parseDSL, dslToReactFlow } from '@/lib/workflow-dsl';
 * ```
 */

// Types (all safe for client-side)
export type {
  // Transitions
  TransitionDef,
  SimpleTransition,
  ConditionalTransition,
  SwitchTransition,
  FunctionTransition,
  DSLTransitionObject,
  // Nodes
  DSLNode,
  DSLTriggerNode,
  DSLAgentNode,
  DSLCommandNode,
  DSLSlashCommandNode,
  DSLEvalNode,
  DSLHttpNode,
  DSLLlmNode,
  DSLDynamicAgentNode,
  DSLDynamicCommandNode,
  DSLGitHubProjectNode,
  DSLGitCheckoutNode,
  DSLCustomField,
  // Metadata
  DSLMeta,
  DSLNodeMeta,
  DSLEdgeMeta,
  // Workflow
  DSLWorkflow,
  ParsedWorkflow,
  GeneratedDSL,
} from './types';

// Type conversion maps
export {
  NODE_TYPE_TO_DSL,
  DSL_TO_NODE_TYPE,
  AGENT_MODEL_TO_DSL,
  DSL_TO_AGENT_MODEL,
} from './types';

// Transition utilities
export {
  // Parsing
  parseTransition,
  parseFunctionTransition,
  // Serialization
  serializeTransition,
  transitionToRuntimeFunction,
  // Validation
  validateTransition,
  // Helpers
  getTransitionTargets,
  isDynamicTransition,
  isSimpleTransition,
  // Factory functions
  simpleTransition,
  conditionalTransition,
  switchTransition,
  functionTransition,
} from './transitions';

// Generator (safe for client-side)
export { generateDSL } from './generator';

// Validation (safe for client-side - only validates parsed DSLWorkflow objects)
export { validateDSL } from './validation';
export type { ValidationError, ValidationResult } from './validation';

// NOTE: parseDSL and dslToReactFlow are NOT exported here because they use ts-morph
// which requires Node.js fs module. Use the /api/workflows/parse endpoint instead.
