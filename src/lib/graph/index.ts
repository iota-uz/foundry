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
 */

// ============================================================================
// Core Runtime Types
// ============================================================================

export type {
  BaseState,
  GraphNode,
  GraphContext,
  IAgentWrapper,
  GraphEngineConfig,
  // Port data flow
  PortInputs,
  // Message types
  Message,
  StoredMessage,
  // Config loading
  LoadedConfig,
} from './types';

// Config validation error
export { ConfigValidationError } from './types';

// ============================================================================
// Workflow Definition API
// ============================================================================

// Enums
export {
  NodeType,
  StdlibTool,
  WorkflowStatus,
  AgentModel,
  SpecialNode,
  MODEL_IDS,
  END_NODE,
  // Multi-provider LLM support
  LLMProvider,
  LLM_MODELS,
  getModelMetadata,
  getProviderForModel,
} from './enums';
export type {
  EndNode,
  // Multi-provider LLM types
  LLMModelId,
  LLMModelMetadata,
} from './enums';

// Schema-based workflow definition
export {
  defineNodes,
  defineWorkflow,
  createInitialWorkflowState,
  resolveDynamic,
} from './schema';

export type {
  // Core types
  WorkflowState,
  WorkflowConfig,
  NodeSchema,
  Dynamic,
  // Tools
  InlineTool,
  ToolReference,
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
  AgentNodeConfig,
  CommandNodeConfig,
  SlashCommandNodeConfig,
  EvalNodeConfig,
  DynamicAgentNodeConfig,
  DynamicCommandNodeConfig,
} from './schema';

// Runtime-compatible transition types (single generic argument)
export type {
  Transition,
} from './types';

// ============================================================================
// Validation
// ============================================================================

export {
  validateWorkflow,
  validateNode,
  validateRuntimeTransition,
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

// ============================================================================
// Runtime Engine
// ============================================================================

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
  resolveTransition,
} from './config-loader';
export type { LoadConfigOptions } from './config-loader';

// ============================================================================
// Standard Library Nodes
// ============================================================================

// Base classes and utilities
export {
  BaseNode,
  NodeExecutionError,
  isInlineToolDefinition,
} from './nodes';

export type {
  BaseNodeConfig,
  NodeExecutionResult,
} from './nodes';

// Runtime node classes
export {
  // Claude Code
  AgentNodeRuntime,
  SlashCommandNodeRuntime,
  createAgentNode,
  createSlashCommandNode,
  // General
  CommandNodeRuntime,
  HttpNodeRuntime,
  LLMNodeRuntime,
  createHttpNode,
  // GitHub
  GitHubProjectNodeRuntime,
  GithubCommentsNodeRuntime,
  GitHubPRVisualizerNodeRuntime,
  createGitHubProjectNode,
  createGithubCommentsNode,
  createGitHubPRVisualizerNode,
  // Primitives
  EvalNodeRuntime,
  DynamicAgentNodeRuntime,
  DynamicCommandNodeRuntime,
} from './nodes';

export type {
  // AgentNode
  AgentNodeConfig as AgentNodeRuntimeConfig,
  StoredMessage as AgentStoredMessage,
  // CommandNode
  CommandNodeConfig as CommandNodeRuntimeConfig,
  CommandResult,
  CommandSpec,
  // SlashCommandNode
  SlashCommandNodeConfig as SlashCommandNodeRuntimeConfig,
  SlashCommand,
  SlashCommandResult,
  // HttpNode
  HttpNodeConfig,
  HttpResult,
  // LLMNode
  LLMNodeConfig,
  LLMResult,
  ReasoningEffort,
  OutputMode,
  // GitHubProjectNode
  GitHubProjectNodeConfig,
  GitHubProjectResult,
  // GithubCommentsNode
  GithubCommentsNodeConfig,
  CommentAction,
  CommentResult,
  // GitHubPRVisualizerNode
  GitHubPRVisualizerNodeConfig,
  PRVisualizerResult,
  WorkflowNodeMeta,
  // Primitives
  EvalNodeConfig as EvalNodeRuntimeConfig,
  EvalResult,
  DynamicAgentNodeConfig as DynamicAgentNodeRuntimeConfig,
  DynamicAgentResult,
  DynamicCommandNodeConfig as DynamicCommandNodeRuntimeConfig,
  DynamicCommandResult,
} from './nodes';

// Module namespaces
export * as github from './nodes/github';
export * as claudeCode from './nodes/claude-code';
export * as general from './nodes/general';
export * as primitives from './nodes/primitives';

// Re-export FieldUpdate type for GitHubProjectNode
export type { FieldUpdate } from '../github-projects';

// ============================================================================
// MCP Server Support
// ============================================================================

export {
  McpPresetId,
  MCP_PRESETS,
  getMcpPreset,
  resolvePresetConfig,
} from './mcp-presets';

export type {
  McpServerConfig,
  McpStdioConfig,
  McpHttpConfig,
  McpSseConfig,
  McpPresetDefinition,
  McpServerSelection,
  PresetMcpServer,
  CustomMcpServer,
} from './mcp-presets';
