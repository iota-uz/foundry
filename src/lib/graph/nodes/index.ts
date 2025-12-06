/**
 * @sys/graph/nodes - Standard Library Nodes
 *
 * Pre-built node implementations for common agentic workflow patterns.
 * Export this namespace for easy consumption in atomic.config.ts.
 *
 * @example
 * ```typescript
 * import { nodes } from '@sys/graph';
 *
 * export default defineWorkflow({
 *   id: 'my-workflow',
 *   nodes: {
 *     START: nodes.GitHubProjectNode({
 *       token: process.env.GITHUB_TOKEN!,
 *       projectOwner: 'myorg',
 *       projectNumber: 1,
 *       owner: 'myorg',
 *       repo: 'myrepo',
 *       updates: { type: 'single_select', field: 'Status', value: 'In Progress' },
 *       next: 'PLAN',
 *     }),
 *     PLAN: nodes.AgentNode({ role: 'planner', system: '...', next: 'BUILD' }),
 *     BUILD: nodes.CommandNode({ command: 'bun build', next: 'TEST' }),
 *     TEST: nodes.SlashCommandNode({ command: 'test', args: 'all tests', next: 'DONE' }),
 *     DONE: nodes.GitHubProjectNode({
 *       token: process.env.GITHUB_TOKEN!,
 *       projectOwner: 'myorg',
 *       projectNumber: 1,
 *       owner: 'myorg',
 *       repo: 'myrepo',
 *       updates: { type: 'single_select', field: 'Status', value: 'Done' },
 *       next: 'END',
 *     }),
 *   }
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
  createCommandNode,
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
  createLLMNode,
} from './general/llm-node';

// Re-export as module namespace
export * as general from './general';

// ============================================================================
// Re-export types from parent module for convenience
// ============================================================================

export type {
  WorkflowState,
  GraphContext,
  Transition,
  ToolReference,
  InlineToolDefinition,
} from '../types';

// Re-export FieldUpdate type for GitHubProjectNode
export type { FieldUpdate } from '../../github-projects';
