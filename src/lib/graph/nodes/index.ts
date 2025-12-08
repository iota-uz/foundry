/**
 * @sys/graph/nodes - Standard Library Nodes
 *
 * Pre-built node implementations for common agentic workflow patterns.
 * These are the runtime implementations used internally by the GraphEngine.
 *
 * For defining workflows, use the schema-based API:
 *
 * @example
 * ```typescript
 * import { defineNodes, defineWorkflow, StdlibTool, AgentModel } from '@sys/graph';
 *
 * const schema = defineNodes<MyContext>()(['PLAN', 'BUILD', 'TEST'] as const);
 *
 * export default defineWorkflow({
 *   id: 'my-workflow',
 *   schema,
 *   initialContext: {},
 *   nodes: [
 *     schema.agent('PLAN', { role: 'planner', prompt: '...', then: 'BUILD' }),
 *     schema.command('BUILD', { command: 'bun build', then: 'TEST' }),
 *     schema.slashCommand('TEST', { command: 'test', args: 'all tests', then: 'END' }),
 *   ]
 * });
 * ```
 */

// Base classes and utilities
export {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  isInlineToolDefinition,
  NodeExecutionError,
} from './base';

// ============================================================================
// GitHub Integration Nodes
// ============================================================================

export {
  GitHubProjectNodeRuntime,
  type GitHubProjectNodeConfig,
  type GitHubProjectResult,
  createGitHubProjectNode,
} from './github/project-node';

export {
  GithubCommentsNodeRuntime,
  type GithubCommentsNodeConfig,
  type CommentAction,
  type CommentResult,
  createGithubCommentsNode,
} from './github/comments-node';

export {
  GitHubPRVisualizerNodeRuntime,
  type GitHubPRVisualizerNodeConfig,
  type PRVisualizerResult,
  type WorkflowNodeMeta,
  createGitHubPRVisualizerNode,
} from './github/pr-visualizer-node';

// Re-export as module namespace
export * as github from './github';

// ============================================================================
// Claude Code Integration Nodes
// ============================================================================

export {
  AgentNodeRuntime,
  type AgentNodeConfig,
  type StoredMessage,
  createAgentNode,
} from './claude-code/agent-node';

export {
  SlashCommandNodeRuntime,
  type SlashCommandNodeConfig,
  type SlashCommand,
  type SlashCommandResult,
  createSlashCommandNode,
} from './claude-code/slash-command-node';

// Re-export as module namespace
export * as claudeCode from './claude-code';

// ============================================================================
// General Purpose Nodes
// ============================================================================

export {
  CommandNodeRuntime,
  type CommandNodeConfig,
  type CommandResult,
} from './general/command-node';

export {
  HttpNodeRuntime,
  type HttpNodeConfig,
  type HttpResult,
  createHttpNode,
} from './general/http-node';

export {
  LLMNodeRuntime,
  type LLMNodeConfig,
  type LLMResult,
  type LLMModel,
  type ReasoningEffort,
} from './general/llm-node';

// Re-export as module namespace
export * as general from './general';

// ============================================================================
// Primitive Nodes (Dynamic/Composable)
// ============================================================================

export {
  EvalNodeRuntime,
  type EvalNodeConfig,
  type EvalResult,
} from './primitives/eval-node';

export {
  DynamicAgentNodeRuntime,
  type DynamicAgentNodeConfig,
  type DynamicAgentResult,
} from './primitives/dynamic-agent-node';

export {
  DynamicCommandNodeRuntime,
  type DynamicCommandNodeConfig,
  type DynamicCommandResult,
} from './primitives/dynamic-command-node';

// Re-export as module namespace
export * as primitives from './primitives';

// ============================================================================
// Re-export types from parent module for convenience
// ============================================================================

export type {
  WorkflowState,
  GraphContext,
  Transition,
  ToolReference,
  InlineTool,
  Dynamic,
} from '../types';

export { AgentModel } from '../enums';

// Re-export FieldUpdate type for GitHubProjectNode
export type { FieldUpdate } from '../../github-projects';
