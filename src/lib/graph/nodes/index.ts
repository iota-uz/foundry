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
 *     START: nodes.GitHubProjectNode({ status: 'In Progress', next: 'PLAN' }),
 *     PLAN: nodes.AgentNode({ role: 'planner', system: '...', next: 'BUILD' }),
 *     BUILD: nodes.CommandNode({ command: 'npm run build', next: 'TEST' }),
 *     TEST: nodes.SlashCommandNode({ command: 'test', args: 'all tests', next: 'DONE' }),
 *     DONE: nodes.GitHubProjectNode({ status: 'Done', next: 'END' }),
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

// AgentNode
export {
  AgentNodeRuntime,
  type AgentNodeConfig,
  type StoredMessage,
  createAgentNode,
} from './agent-node';

// CommandNode
export {
  CommandNodeRuntime,
  type CommandNodeConfig,
  type CommandResult,
  createCommandNode,
} from './command-node';

// SlashCommandNode
export {
  SlashCommandNodeRuntime,
  type SlashCommandNodeConfig,
  type SlashCommand,
  type SlashCommandResult,
  createSlashCommandNode,
} from './slash-command-node';

// GitHubProjectNode
export {
  GitHubProjectNodeRuntime,
  type GitHubProjectNodeConfig,
  type GitHubProjectResult,
  createGitHubProjectNode,
} from './github-project-node';

// Re-export types from parent module for convenience
export type {
  WorkflowState,
  GraphContext,
  Transition,
  ToolReference,
  InlineToolDefinition,
} from '../types';
