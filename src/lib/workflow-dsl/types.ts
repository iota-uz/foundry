/**
 * Workflow DSL Types
 *
 * Type definitions for the TypeScript workflow DSL format.
 * These types define the structure of workflow definitions that can be:
 * - Generated from React Flow canvas
 * - Parsed from TypeScript code
 * - Executed standalone or via the platform
 */

import { NodeType, AgentModel, type StdlibTool, type LLMModelId } from '@/lib/graph/enums';
import type { McpServerSelection } from '@/lib/graph/mcp-presets';
import type { FieldUpdate } from '@/lib/github-projects';

// ============================================================================
// Transition Types
// ============================================================================

/**
 * Simple transition - always goes to target
 */
export interface SimpleTransition {
  type: 'simple';
  target: string;
}

/**
 * Conditional transition - binary branch based on expression
 */
export interface ConditionalTransition {
  type: 'conditional';
  /** Expression to evaluate (e.g., 'context.testsPassed') */
  condition: string;
  /** Target when condition is truthy */
  thenTarget: string;
  /** Target when condition is falsy */
  elseTarget: string;
}

/**
 * Switch transition - multi-way branch based on expression
 */
export interface SwitchTransition {
  type: 'switch';
  /** Expression to match against (e.g., 'context.status') */
  expression: string;
  /** Map of values to target nodes */
  cases: Record<string, string>;
  /** Default target when no case matches */
  defaultTarget: string;
}

/**
 * Function transition - full TypeScript function (escape hatch)
 * Canvas shows "Edit in code" warning for these
 */
export interface FunctionTransition {
  type: 'function';
  /** Raw function source code */
  source: string;
}

/**
 * Union of all transition types
 */
export type TransitionDef =
  | SimpleTransition
  | ConditionalTransition
  | SwitchTransition
  | FunctionTransition;

// ============================================================================
// DSL Node Configurations
// ============================================================================

/**
 * Base configuration shared by all DSL nodes
 */
interface BaseDSLNodeConfig {
  /** Transition to next node */
  then: string | DSLTransitionObject | TransitionDef;
}

/**
 * Object form of transition for DSL (parsed from code)
 */
export interface DSLTransitionObject {
  /** Conditional transition */
  if?: string;
  then?: string;
  else?: string;
  /** Switch transition */
  match?: string;
  cases?: Record<string, string>;
  default?: string;
}

/**
 * Agent node - AI-powered execution with tools
 */
export interface DSLAgentNode extends BaseDSLNodeConfig {
  type: 'agent';
  role: string;
  prompt: string;
  tools: StdlibTool[];
  model: 'haiku' | 'sonnet' | 'opus';
  maxTurns?: number;
  temperature?: number;
  mcpServers?: McpServerSelection[];
}

/**
 * Command node - shell command execution
 */
export interface DSLCommandNode extends BaseDSLNodeConfig {
  type: 'command';
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  throwOnError?: boolean;
}

/**
 * Slash command node - Claude Code operations
 */
export interface DSLSlashCommandNode extends BaseDSLNodeConfig {
  type: 'slash-command';
  command: string;
  args?: string;
}

/**
 * Eval node - JavaScript transformation
 */
export interface DSLEvalNode extends BaseDSLNodeConfig {
  type: 'eval';
  code: string;
}

/**
 * HTTP node - REST API calls
 */
export interface DSLHttpNode extends BaseDSLNodeConfig {
  type: 'http';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * LLM node - direct LLM calls with multi-provider support
 */
export interface DSLLlmNode extends BaseDSLNodeConfig {
  type: 'llm';
  model: 'haiku' | 'sonnet' | 'opus';
  prompt: string;
  llmModel?: LLMModelId;
  systemPrompt?: string;
  userPrompt?: string;
  outputMode?: 'text' | 'json';
  outputSchema?: string;
  temperature?: number;
  maxTokens?: number;
  enableWebSearch?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

/**
 * Dynamic agent node - runtime-computed agent config
 */
export interface DSLDynamicAgentNode extends BaseDSLNodeConfig {
  type: 'dynamic-agent';
  modelExpression: string;
  promptExpression: string;
  systemExpression?: string;
}

/**
 * Dynamic command node - runtime-computed command
 */
export interface DSLDynamicCommandNode extends BaseDSLNodeConfig {
  type: 'dynamic-command';
  commandExpression: string;
  cwdExpression?: string;
}

/**
 * GitHub Project node - update project status
 */
export interface DSLGitHubProjectNode extends BaseDSLNodeConfig {
  type: 'github-project';
  token: string;
  projectOwner: string;
  projectNumber: number;
  owner: string;
  repo: string;
  updates: FieldUpdate[];
  issueNumber?: number;
  issueNumberKey?: string;
}

/**
 * Git Checkout node - clone repository
 */
export interface DSLGitCheckoutNode extends BaseDSLNodeConfig {
  type: 'git-checkout';
  useIssueContext: boolean;
  owner?: string;
  repo?: string;
  ref: string;
  depth: number;
  skipIfExists?: boolean;
}

/**
 * Trigger node - workflow entry point (special, no then)
 */
export interface DSLTriggerNode {
  type: 'trigger';
  customFields?: DSLCustomField[];
  then: string;
}

/**
 * Custom field for trigger node
 */
export interface DSLCustomField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  defaultValue?: unknown;
}

/**
 * Union of all DSL node types
 */
export type DSLNode =
  | DSLTriggerNode
  | DSLAgentNode
  | DSLCommandNode
  | DSLSlashCommandNode
  | DSLEvalNode
  | DSLHttpNode
  | DSLLlmNode
  | DSLDynamicAgentNode
  | DSLDynamicCommandNode
  | DSLGitHubProjectNode
  | DSLGitCheckoutNode;

// ============================================================================
// Visual Metadata
// ============================================================================

/**
 * Node visual metadata for Canvas restoration
 */
export interface DSLNodeMeta {
  x: number;
  y: number;
  color?: string;
  collapsed?: boolean;
}

/**
 * Edge visual metadata
 */
export interface DSLEdgeMeta {
  label?: string;
  animated?: boolean;
  style?: 'bezier' | 'step' | 'straight';
}

/**
 * Complete visual metadata block
 */
export interface DSLMeta {
  /** Layout algorithm */
  layout?: 'dagre' | 'manual';
  /** Flow direction */
  direction?: 'LR' | 'TB';
  /** Viewport state for restoring view */
  viewport?: { x: number; y: number; zoom: number };
  /** Per-node visual properties */
  nodes?: Record<string, DSLNodeMeta>;
  /** Per-edge visual properties (key format: "SOURCE->TARGET") */
  edges?: Record<string, DSLEdgeMeta>;
}

// ============================================================================
// Workflow Definition
// ============================================================================

/**
 * Complete workflow definition in DSL format
 */
export interface DSLWorkflow {
  /** Unique workflow identifier */
  id: string;
  /** Human-readable name (optional, defaults to id) */
  name?: string;
  /** Workflow description */
  description?: string;
  /** Visual metadata - ignored at runtime */
  _meta?: DSLMeta;
  /** Initial context with type hints */
  context: Record<string, unknown>;
  /** Node definitions keyed by name */
  nodes: Record<string, DSLNode>;
  /** Entry point node name */
  start: string;
}

// ============================================================================
// Parse/Generate Results
// ============================================================================

/**
 * Result of parsing DSL code
 */
export interface ParsedWorkflow {
  workflow: DSLWorkflow;
  /** Any warnings during parsing */
  warnings: string[];
  /** Raw node IDs for React Flow restoration */
  nodeIds?: Record<string, string>;
}

/**
 * Result of generating DSL code
 */
export interface GeneratedDSL {
  /** Generated TypeScript code */
  code: string;
  /** Any warnings during generation */
  warnings: string[];
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/**
 * Map from store NodeType to DSL node type string
 */
export const NODE_TYPE_TO_DSL: Record<NodeType, string> = {
  [NodeType.Trigger]: 'trigger',
  [NodeType.Agent]: 'agent',
  [NodeType.Command]: 'command',
  [NodeType.SlashCommand]: 'slash-command',
  [NodeType.Eval]: 'eval',
  [NodeType.Http]: 'http',
  [NodeType.Llm]: 'llm',
  [NodeType.DynamicAgent]: 'dynamic-agent',
  [NodeType.DynamicCommand]: 'dynamic-command',
  [NodeType.GitHubProject]: 'github-project',
  [NodeType.GitCheckout]: 'git-checkout',
  [NodeType.End]: 'end',
};

/**
 * Map from DSL node type string to store NodeType
 */
export const DSL_TO_NODE_TYPE: Record<string, NodeType> = {
  trigger: NodeType.Trigger,
  agent: NodeType.Agent,
  command: NodeType.Command,
  'slash-command': NodeType.SlashCommand,
  eval: NodeType.Eval,
  http: NodeType.Http,
  llm: NodeType.Llm,
  'dynamic-agent': NodeType.DynamicAgent,
  'dynamic-command': NodeType.DynamicCommand,
  'github-project': NodeType.GitHubProject,
  'git-checkout': NodeType.GitCheckout,
  end: NodeType.End,
};

/**
 * Map from AgentModel to DSL model string
 */
export const AGENT_MODEL_TO_DSL: Record<AgentModel, string> = {
  [AgentModel.Haiku]: 'haiku',
  [AgentModel.Sonnet]: 'sonnet',
  [AgentModel.Opus]: 'opus',
};

/**
 * Map from DSL model string to AgentModel
 */
export const DSL_TO_AGENT_MODEL: Record<string, AgentModel> = {
  haiku: AgentModel.Haiku,
  sonnet: AgentModel.Sonnet,
  opus: AgentModel.Opus,
};
