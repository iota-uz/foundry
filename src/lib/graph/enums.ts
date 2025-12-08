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
 * @example
 * ```typescript
 * schema.agent('PLAN', {
 *   capabilities: [StdlibTool.ReadFile, StdlibTool.ListFiles],
 *   // ...
 * })
 * ```
 */
export enum StdlibTool {
  // ============================================================================
  // File System Tools
  // ============================================================================

  /** List files in a directory */
  ListFiles = 'list_files',

  /** Read file contents */
  ReadFile = 'read_file',

  /** Write content to a file */
  WriteFile = 'write_file',

  /** Edit file with search/replace */
  EditFile = 'edit_file',

  /** Delete a file */
  DeleteFile = 'delete_file',

  /** Create a directory */
  CreateDirectory = 'create_directory',

  // ============================================================================
  // Code Search & Navigation
  // ============================================================================

  /** Search code with regex patterns */
  SearchCode = 'search_code',

  /** Find files by glob pattern */
  GlobFiles = 'glob_files',

  /** Get file tree structure */
  FileTree = 'file_tree',

  // ============================================================================
  // Shell & System
  // ============================================================================

  /** Execute shell commands */
  Bash = 'bash',

  /** Run a command and capture output */
  RunCommand = 'run_command',

  // ============================================================================
  // Git Operations
  // ============================================================================

  /** Get git status */
  GitStatus = 'git_status',

  /** Get git diff */
  GitDiff = 'git_diff',

  /** Create git commit */
  GitCommit = 'git_commit',

  /** Git log history */
  GitLog = 'git_log',

  // ============================================================================
  // Web & Network
  // ============================================================================

  /** Fetch URL content */
  WebFetch = 'web_fetch',

  /** Web search */
  WebSearch = 'web_search',

  // ============================================================================
  // Code Intelligence
  // ============================================================================

  /** Get symbol definitions */
  GetDefinitions = 'get_definitions',

  /** Get symbol references */
  GetReferences = 'get_references',

  /** Get hover information */
  GetHoverInfo = 'get_hover_info',
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
 * Reserved node name for workflow termination.
 * All workflows implicitly have this as a valid transition target.
 */
export const END_NODE = 'END' as const;

/**
 * Type for the END node constant.
 */
export type EndNode = typeof END_NODE;
