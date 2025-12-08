/**
 * @sys/graph - Core Enums
 *
 * Type-safe enums for the graph engine API.
 * Using enums instead of string literals prevents typos and enables autocomplete.
 */

/**
 * Node type discriminator.
 * Every node definition must specify one of these types.
 */
export enum NodeType {
  /** AI agent node with Claude SDK */
  Agent = 'agent',

  /** Shell command execution node */
  Command = 'command',

  /** Claude Code slash command node */
  SlashCommand = 'slash-command',

  /** GitHub Project integration node */
  GitHubProject = 'github-project',

  /** Pure context transformation node (no LLM) */
  Eval = 'eval',

  /** Dynamic AI agent with runtime configuration */
  DynamicAgent = 'dynamic-agent',

  /** Dynamic shell command with runtime configuration */
  DynamicCommand = 'dynamic-command',

  /** HTTP request node */
  Http = 'http',

  /** Direct LLM call node (no agent loop) */
  Llm = 'llm',
}

/**
 * Workflow execution status.
 */
export enum WorkflowStatus {
  /** Workflow created but not started */
  Pending = 'pending',

  /** Workflow is currently executing */
  Running = 'running',

  /** Workflow completed successfully */
  Completed = 'completed',

  /** Workflow failed with an error */
  Failed = 'failed',

  /** Workflow was paused and can be resumed */
  Paused = 'paused',
}

/**
 * Standard library tools available to agent nodes.
 *
 * These are the built-in Claude Code tools that can be referenced by name.
 * Using this enum instead of strings prevents typos and enables autocomplete.
 *
 * @see https://docs.anthropic.com/en/docs/agent-sdk/typescript - Agent SDK Reference
 *
 * @example
 * ```typescript
 * schema.agent('PLAN', {
 *   capabilities: [StdlibTool.Read, StdlibTool.Glob],
 *   // ...
 * })
 * ```
 */
export enum StdlibTool {
  // ============================================================================
  // File System Tools
  // ============================================================================

  /** Read files (text, images, PDFs, notebooks) */
  Read = 'Read',

  /** Write content to a file */
  Write = 'Write',

  /** Perform string replacements in files */
  Edit = 'Edit',

  /** File pattern matching with glob patterns */
  Glob = 'Glob',

  /** Code search with ripgrep */
  Grep = 'Grep',

  /** Edit Jupyter notebook cells */
  NotebookEdit = 'NotebookEdit',

  // ============================================================================
  // Shell & System
  // ============================================================================

  /** Execute shell commands */
  Bash = 'Bash',

  /** Retrieve output from background shells */
  BashOutput = 'BashOutput',

  /** Kill a running background shell */
  KillBash = 'KillBash',

  // ============================================================================
  // Web & Network
  // ============================================================================

  /** Fetch and process URL content */
  WebFetch = 'WebFetch',

  /** Web search */
  WebSearch = 'WebSearch',

  // ============================================================================
  // Agent & Workflow
  // ============================================================================

  /** Launch subagents for complex tasks */
  Task = 'Task',

  /** Task list management */
  TodoWrite = 'TodoWrite',

  /** Exit planning mode */
  ExitPlanMode = 'ExitPlanMode',

  // ============================================================================
  // MCP Integration
  // ============================================================================

  /** List available MCP resources */
  ListMcpResources = 'ListMcpResources',

  /** Read a specific MCP resource */
  ReadMcpResource = 'ReadMcpResource',
}

/**
 * Agent model selection.
 * Maps to specific Claude model versions.
 */
export enum AgentModel {
  /** Fast, cost-effective for routine tasks */
  Haiku = 'haiku',

  /** Balanced performance for most tasks (default) */
  Sonnet = 'sonnet',

  /** Most capable for complex reasoning */
  Opus = 'opus',
}

/**
 * Maps AgentModel enum to actual Claude model IDs.
 */
export const MODEL_IDS: Record<AgentModel, string> = {
  [AgentModel.Haiku]: 'claude-haiku-4.5',
  [AgentModel.Sonnet]: 'claude-sonnet-4.5',
  [AgentModel.Opus]: 'claude-opus-4.5',
};

/**
 * Special node transitions for workflow control flow.
 * These are always valid transition targets regardless of schema.
 */
export enum SpecialNode {
  /** Workflow terminates successfully */
  End = 'END',

  /** Workflow terminates with error state */
  Error = 'ERROR',
}

/**
 * @deprecated Use SpecialNode.End instead
 * Reserved node name for workflow termination.
 */
export const END_NODE = SpecialNode.End;

/**
 * @deprecated Use SpecialNode instead
 * Type for special node constants.
 */
export type EndNode = SpecialNode;
