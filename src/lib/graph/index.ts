/**
 * @sys/graph - Public API
 *
 * A resilient, type-safe framework for building Stateful Agentic Workflows.
 *
 * Key Features:
 * - Resumability: Workflows can be paused and resumed at any step
 * - Context Hygiene: Programmatic control over agent memory persistence
 * - SDK Abstraction: Wraps Claude Agent SDK with automatic tool execution
 * - Type Safety: Full TypeScript generics for custom state types
 *
 * ## New API (v2) - Recommended
 *
 * The new API provides compile-time type safety for transitions:
 *
 * @example
 * ```typescript
 * import { defineNodes, defineWorkflow, StdlibTool, AgentModel } from '@sys/graph';
 *
 * interface MyContext extends Record<string, unknown> {
 *   counter: number;
 * }
 *
 * const schema = defineNodes<MyContext>()(['INCREMENT', 'CHECK', 'DONE'] as const);
 *
 * export default defineWorkflow({
 *   id: 'counter-workflow',
 *   schema,
 *   initialContext: { counter: 0 },
 *   nodes: [
 *     schema.eval('INCREMENT', {
 *       update: (state) => ({ counter: state.context.counter + 1 }),
 *       then: 'CHECK'
 *     }),
 *     schema.eval('CHECK', {
 *       update: (state) => state.context,
 *       then: (state) => state.context.counter >= 5 ? 'DONE' : 'INCREMENT'
 *     }),
 *     schema.command('DONE', {
 *       command: 'echo "Finished!"',
 *       then: 'END'
 *     })
 *   ]
 * });
 * ```
 *
 * ## Legacy API (v1) - Deprecated
 *
 * The old map-based API is still supported for backward compatibility:
 *
 * @example
 * ```typescript
 * import { defineWorkflow, nodes } from '@sys/graph';
 *
 * export default defineWorkflow({
 *   id: 'my-workflow',
 *   nodes: {
 *     START: nodes.AgentNode({ ... }),
 *     END: nodes.CommandNode({ ... })
 *   }
 * });
 * ```
 */

// Core types
export type {
  BaseState,
  GraphNode,
  GraphContext,
  IAgentWrapper,
  GraphEngineConfig,
  // Workflow config types
  WorkflowState,
  WorkflowConfig,
  NodeDefinition,
  AgentNodeDefinition,
  CommandNodeDefinition,
  SlashCommandNodeDefinition,
  BaseNodeDefinition,
  Transition,
  StaticTransition,
  DynamicTransition,
  ToolReference,
  InlineToolDefinition,
  LoadedConfig,
  // Primitive node types
  EvalNodeDefinition,
  DynamicAgentNodeDefinition,
  DynamicCommandNodeDefinition,
  AgentModel as LegacyAgentModel,
  Dynamic as LegacyDynamic,
  // Message types
  Message,
  StoredMessage,
} from './types';

// Config validation error
export { ConfigValidationError } from './types';

// Main engine
export { GraphEngine } from './engine';
export type { GraphEngineOptions } from './engine';

// State management
export { StateManager } from './state-manager';
export type { StateManagerConfig } from './state-manager';

// Agent wrapper
export { AgentWrapper } from './agent/wrapper';
export type { AgentWrapperConfig } from './agent/wrapper';

// Tool utilities
export { toSdkTool, toSdkTools } from './agent/tools';
export type { GraphTool, SdkToolDefinition } from './agent/tools';

// Utilities
export { createLogger } from './utils/logger';
export type { LogContext } from './utils/logger';

// Config loader
export {
  loadConfig,
  validateTransitions,
  validateConfigSchema,
  validateRuntimeTransition,
  resolveTransition,
} from './config-loader';
export type { LoadConfigOptions } from './config-loader';

// Workflow definition API
export {
  defineWorkflow,
  nodes,
  AgentNode,
  CommandNode,
  SlashCommandNode,
  // Primitive node factories
  EvalNode,
  DynamicAgentNode,
  DynamicCommandNode,
  createInitialState,
} from './define-workflow';
export type {
  ExtractContext,
  WorkflowStateOf,
} from './define-workflow';

// Standard library node implementations
export {
  // Base
  BaseNode,
  NodeExecutionError,
  isInlineToolDefinition,
  // Runtime classes
  AgentNodeRuntime,
  CommandNodeRuntime,
  SlashCommandNodeRuntime,
  // Primitive runtime classes
  EvalNodeRuntime,
  DynamicAgentNodeRuntime,
  DynamicCommandNodeRuntime,
  // Factory functions
  createAgentNode,
  createSlashCommandNode,
} from './nodes';
export type {
  // Base types
  BaseNodeConfig,
  NodeExecutionResult,
  // AgentNode types
  AgentNodeConfig,
  StoredMessage as AgentStoredMessage,
  // CommandNode types
  CommandNodeConfig,
  CommandResult,
  // SlashCommandNode types
  SlashCommandNodeConfig,
  SlashCommand,
  SlashCommandResult,
  // Primitive node types
  EvalNodeConfig,
  EvalResult,
  DynamicAgentNodeConfig,
  DynamicAgentResult,
  DynamicCommandNodeConfig,
  DynamicCommandResult,
} from './nodes';

// ============================================================================
// New API (v2) - Type-Safe Schema-Based Workflow Definition
// ============================================================================

// Enums
export {
  NodeType,
  StdlibTool,
  WorkflowStatus,
  AgentModel,
  MODEL_IDS,
  END_NODE,
} from './enums';
export type { EndNode } from './enums';

// Schema-based workflow definition
export {
  defineNodes,
  defineWorkflow as defineWorkflowV2,
  createInitialWorkflowState,
  resolveDynamic,
} from './schema';
export type {
  // Core types
  WorkflowState as WorkflowStateV2,
  WorkflowConfig as WorkflowConfigV2,
  NodeSchema,
  // Transitions
  StaticTransition as StaticTransitionV2,
  DynamicTransition as DynamicTransitionV2,
  Transition as TransitionV2,
  Dynamic,
  // Tools
  InlineTool,
  ToolReference as ToolReferenceV2,
  // Node definitions
  NodeDef,
  BaseNodeDef,
  AgentNodeDef,
  CommandNodeDef,
  SlashCommandNodeDef,
  EvalNodeDef,
  DynamicAgentNodeDef,
  DynamicCommandNodeDef,
  // Node configs
  AgentNodeConfig as AgentNodeConfigV2,
  CommandNodeConfig as CommandNodeConfigV2,
  SlashCommandNodeConfig as SlashCommandNodeConfigV2,
  EvalNodeConfig as EvalNodeConfigV2,
  DynamicAgentNodeConfig as DynamicAgentNodeConfigV2,
  DynamicCommandNodeConfig as DynamicCommandNodeConfigV2,
} from './schema';

// Validation
export {
  validateWorkflow,
  validateNode,
  validateRuntimeTransition as validateRuntimeTransitionV2,
  validateState,
  validateSemantics,
  validateComplete,
  // Zod schemas
  NodeTypeSchema,
  StdlibToolSchema,
  AgentModelSchema,
  WorkflowStatusSchema,
  InlineToolSchema,
  ToolReferenceSchema,
  WorkflowStateSchema,
  createNodeSchema,
  createWorkflowSchema,
} from './validation';
export type {
  ValidationResult,
  ValidationError,
} from './validation';
