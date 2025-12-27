/**
 * Workflow DSL
 *
 * TypeScript DSL for defining, generating, and parsing workflow definitions.
 *
 * @example
 * ```typescript
 * import { generateDSL, parseDSL } from '@/lib/workflow-dsl';
 *
 * // Generate DSL from React Flow
 * const { code, warnings } = generateDSL(nodes, edges, metadata);
 * console.log(code);
 *
 * // Parse DSL to React Flow (coming soon)
 * const { workflow, warnings } = parseDSL(code);
 * ```
 */

// Types
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

// Generator
export { generateDSL } from './generator';

// Parser
export { parseDSL, dslToReactFlow } from './parser';

// Validation
export { validateDSL } from './validation';
export type { ValidationError, ValidationResult } from './validation';
