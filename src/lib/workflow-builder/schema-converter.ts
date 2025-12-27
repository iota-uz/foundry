/**
 * Schema Converter
 *
 * Converts between React Flow format and GraphEngine WorkflowConfig format.
 * This allows the visual builder to work with the existing execution engine.
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  WorkflowNodeData,
  NodeConfig,
  AgentNodeConfig,
  CommandNodeConfig,
  SlashCommandNodeConfig,
  EvalNodeConfig,
  LlmNodeConfig,
  HttpNodeConfig,
  DynamicAgentNodeConfig,
  DynamicCommandNodeConfig,
  GitCheckoutNodeConfig,
} from '@/store/workflow-builder.store';
import type { McpServerSelection } from '@/lib/graph/mcp-presets';
import {
  NodeType,
  SpecialNode,
  AgentModel,
  StdlibTool,
  defineNodes,
  defineWorkflow,
  type WorkflowConfig,
  type NodeDef,
  type NodeSchema,
  type LLMModelId,
} from '@/lib/graph';

// ============================================================================
// Types
// ============================================================================

export interface ConvertedWorkflow {
  id: string;
  name: string;
  description?: string;
  config: WorkflowConfig<string, Record<string, unknown>>;
}

export interface ConversionError {
  nodeId: string;
  message: string;
}

export interface ConversionResult {
  success: boolean;
  workflow?: ConvertedWorkflow;
  errors: ConversionError[];
}

// ============================================================================
// React Flow -> GraphEngine
// ============================================================================

/**
 * Build adjacency map from edges for transition lookup
 */
function buildAdjacencyMap(edges: Edge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    const existing = adjacency.get(edge.source) ?? [];
    existing.push(edge.target);
    adjacency.set(edge.source, existing);
  }

  return adjacency;
}

/**
 * Get the target node for a given source node
 * Returns SpecialNode.End if no outgoing edges
 */
function getNextNode(nodeId: string, adjacency: Map<string, string[]>): string {
  const targets = adjacency.get(nodeId);
  if (!targets || targets.length === 0) {
    return SpecialNode.End;
  }
  // For now, just use the first target (single output)
  // TODO: Support conditional routing via edge labels
  return targets[0]!;
}

/**
 * Convert a single React Flow node to a GraphEngine node definition
 */
function convertNode<TNames extends string>(
  node: Node<WorkflowNodeData>,
  adjacency: Map<string, string[]>,
  schema: NodeSchema<TNames, Record<string, unknown>>
): NodeDef<TNames, Record<string, unknown>> | null {
  const { data } = node;
  const nextNodeId = getNextNode(node.id, adjacency);

  // Create transition function that returns the next node
  const transitionFn = () => nextNodeId as TNames;

  switch (data.nodeType) {
    case NodeType.Agent: {
      const config = data.config as AgentNodeConfig;
      return schema.agent(node.id as TNames, {
        role: config.role,
        prompt: config.prompt,
        capabilities: config.capabilities,
        model: config.model,
        ...(config.maxTurns !== undefined && { maxTurns: config.maxTurns }),
        ...(config.temperature !== undefined && { temperature: config.temperature }),
        ...(config.mcpServers !== undefined && { mcpServers: config.mcpServers }),
        then: transitionFn,
      });
    }

    case NodeType.Command: {
      const config = data.config as CommandNodeConfig;
      return schema.command(node.id as TNames, {
        command: config.command,
        ...(config.cwd !== undefined && { cwd: config.cwd }),
        ...(config.env !== undefined && { env: config.env }),
        ...(config.timeout !== undefined && { timeout: config.timeout }),
        ...(config.throwOnError !== undefined && { throwOnError: config.throwOnError }),
        then: transitionFn,
      });
    }

    case NodeType.SlashCommand: {
      const config = data.config as SlashCommandNodeConfig;
      return schema.slashCommand(node.id as TNames, {
        command: config.command,
        args: config.args,
        then: transitionFn,
      });
    }

    case NodeType.Eval: {
      const config = data.config as EvalNodeConfig;
      // Parse the code string into an actual function
      const updateFn = new Function('state', config.code) as (
        state: unknown
      ) => Partial<Record<string, unknown>>;

      return schema.eval(node.id as TNames, {
        update: updateFn,
        then: transitionFn,
      });
    }

    case NodeType.GitHubProject: {
      if (data.config.type !== 'github-project') {
        return null;
      }
      const config = data.config;
      // Create a generic node with github-project type
      // The GraphEngine runtime will handle it via custom node registration
      return {
        name: node.id as TNames,
        type: NodeType.GitHubProject,
        token: config.token,
        projectOwner: config.projectOwner,
        projectNumber: config.projectNumber,
        owner: config.owner,
        repo: config.repo,
        updates: config.updates,
        ...(config.issueNumber !== undefined && { issueNumber: config.issueNumber }),
        ...(config.issueNumberKey !== undefined && { issueNumberKey: config.issueNumberKey }),
        ...(config.throwOnError !== undefined && { throwOnError: config.throwOnError }),
        ...(config.resultKey !== undefined && { resultKey: config.resultKey }),
        then: transitionFn,
      } as unknown as NodeDef<TNames, Record<string, unknown>>;
    }

    case NodeType.Llm: {
      const config = data.config as LlmNodeConfig;
      // Create LLM node definition with all new multi-provider fields
      return {
        name: node.id as TNames,
        type: NodeType.Llm,
        model: config.model,
        systemPrompt: config.systemPrompt,
        userPrompt: config.userPrompt,
        outputMode: config.outputMode,
        ...(config.outputSchema !== undefined && { outputSchema: config.outputSchema }),
        ...(config.temperature !== undefined && { temperature: config.temperature }),
        ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
        ...(config.enableWebSearch !== undefined && { enableWebSearch: config.enableWebSearch }),
        ...(config.reasoningEffort !== undefined && { reasoningEffort: config.reasoningEffort }),
        ...(config.apiKey !== undefined && { apiKey: config.apiKey }),
        ...(config.resultKey !== undefined && { resultKey: config.resultKey }),
        ...(config.throwOnError !== undefined && { throwOnError: config.throwOnError }),
        then: transitionFn,
      } as unknown as NodeDef<TNames, Record<string, unknown>>;
    }

    case NodeType.Http: {
      const config = data.config as HttpNodeConfig;
      // Create HTTP node definition
      return {
        name: node.id as TNames,
        type: NodeType.Http,
        url: config.url,
        method: config.method,
        ...(config.headers !== undefined && { headers: config.headers }),
        ...(config.body !== undefined && { body: config.body }),
        ...(config.timeout !== undefined && { timeout: config.timeout }),
        then: transitionFn,
      } as unknown as NodeDef<TNames, Record<string, unknown>>;
    }

    case NodeType.DynamicAgent: {
      const config = data.config as DynamicAgentNodeConfig;
      // Create DynamicAgent node definition
      return {
        name: node.id as TNames,
        type: NodeType.DynamicAgent,
        modelExpression: config.modelExpression,
        promptExpression: config.promptExpression,
        ...(config.systemExpression !== undefined && { systemExpression: config.systemExpression }),
        then: transitionFn,
      } as unknown as NodeDef<TNames, Record<string, unknown>>;
    }

    case NodeType.DynamicCommand: {
      const config = data.config as DynamicCommandNodeConfig;
      // Create DynamicCommand node definition
      return {
        name: node.id as TNames,
        type: NodeType.DynamicCommand,
        commandExpression: config.commandExpression,
        ...(config.cwdExpression !== undefined && { cwdExpression: config.cwdExpression }),
        then: transitionFn,
      } as unknown as NodeDef<TNames, Record<string, unknown>>;
    }

    case NodeType.GitCheckout: {
      const config = data.config as GitCheckoutNodeConfig;
      // Create GitCheckout node definition
      return {
        name: node.id as TNames,
        type: NodeType.GitCheckout,
        useIssueContext: config.useIssueContext,
        ref: config.ref,
        depth: config.depth,
        ...(config.owner !== undefined && { owner: config.owner }),
        ...(config.repo !== undefined && { repo: config.repo }),
        ...(config.skipIfExists !== undefined && { skipIfExists: config.skipIfExists }),
        then: transitionFn,
      } as unknown as NodeDef<TNames, Record<string, unknown>>;
    }

    default:
      return null;
  }
}

/**
 * Convert React Flow nodes and edges to a GraphEngine WorkflowConfig
 */
export function toWorkflowConfig(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  metadata: { id: string; name: string; description?: string; initialContext?: Record<string, unknown> }
): ConversionResult {
  const errors: ConversionError[] = [];

  if (nodes.length === 0) {
    return {
      success: false,
      errors: [{ nodeId: '', message: 'Workflow must have at least one node' }],
    };
  }

  // Get all node IDs for schema
  const nodeNames = nodes.map((n) => n.id) as readonly string[];

  // Create schema with all node names
  const schema = defineNodes<Record<string, unknown>>()(nodeNames);

  // Build adjacency map for transitions
  const adjacency = buildAdjacencyMap(edges);

  // Convert all nodes
  const nodeDefs: NodeDef<string, Record<string, unknown>>[] = [];

  for (const node of nodes) {
    const nodeDef = convertNode(node, adjacency, schema);
    if (nodeDef) {
      nodeDefs.push(nodeDef);
    } else {
      errors.push({
        nodeId: node.id,
        message: `Unknown node type: ${node.data.nodeType}`,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  try {
    const config = defineWorkflow({
      id: metadata.id,
      schema,
      nodes: nodeDefs,
      ...(metadata.initialContext !== undefined && { initialContext: metadata.initialContext }),
    });

    return {
      success: true,
      workflow: {
        id: metadata.id,
        name: metadata.name,
        ...(metadata.description !== undefined && { description: metadata.description }),
        config,
      },
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      errors: [{
        nodeId: '',
        message: error instanceof Error ? error.message : 'Failed to create workflow config',
      }],
    };
  }
}

// ============================================================================
// GraphEngine -> React Flow
// ============================================================================

/**
 * Default positions for nodes when importing (will be auto-laid out)
 */
function getDefaultPosition(index: number): { x: number; y: number } {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 100 + col * 300,
    y: 100 + row * 200,
  };
}

/**
 * Generic node definition with common properties.
 * Used for conversion when the strict NodeDef union doesn't cover all node types.
 */
interface GenericNodeDef {
  name: string;
  type: NodeType;
  [key: string]: unknown;
}

/**
 * Convert a GraphEngine node definition back to React Flow format
 */
function nodeDefToReactFlow(
  nodeDef: NodeDef<string, Record<string, unknown>>,
  index: number
): Node<WorkflowNodeData> {
  const position = getDefaultPosition(index);
  let config: NodeConfig;
  let label: string;

  // Cast to generic type for accessing properties that may not be in the union
  const def = nodeDef as unknown as GenericNodeDef;

  switch (def.type) {
    case NodeType.Agent:
      label = (def.role as string) ?? 'Agent';
      config = {
        type: 'agent',
        role: def.role as string,
        prompt: def.prompt as string,
        capabilities: (def.capabilities as StdlibTool[]) ?? [],
        model: (def.model as AgentModel) ?? AgentModel.Sonnet,
        ...(def.maxTurns !== undefined && { maxTurns: def.maxTurns as number }),
        ...(def.temperature !== undefined && { temperature: def.temperature as number }),
        mcpServers: (def.mcpServers as McpServerSelection[]) ?? [],
      };
      break;

    case NodeType.Command:
      label = 'Command';
      config = {
        type: 'command',
        command: def.command as string,
        ...(def.cwd !== undefined && { cwd: def.cwd as string }),
        ...(def.env !== undefined && { env: def.env as Record<string, string> }),
        ...(def.timeout !== undefined && { timeout: def.timeout as number }),
        ...(def.throwOnError !== undefined && { throwOnError: def.throwOnError as boolean }),
      };
      break;

    case NodeType.SlashCommand:
      label = `/${def.command as string}`;
      config = {
        type: 'slash-command',
        command: def.command as string,
        args: def.args as string,
      };
      break;

    case NodeType.Eval:
      label = 'Eval';
      config = {
        type: 'eval',
        code: typeof def.update === 'function' ? def.update.toString() : '',
      };
      break;

    case NodeType.Llm: {
      label = 'LLM';
      // Normalize: prefer userPrompt/systemPrompt, fallback to legacy prompt
      const userPromptVal = (def.userPrompt as string | undefined) ?? (def.prompt as string | undefined) ?? '';
      // Determine if model is an LLMModelId or AgentModel
      const modelStr = (def.model as string) ?? '';
      const isLLMModelId = modelStr.startsWith('claude-') || modelStr.startsWith('gpt-') || modelStr.startsWith('gemini-');
      config = {
        type: 'llm',
        // Legacy fields (required for backward compat)
        model: isLLMModelId ? AgentModel.Sonnet : (modelStr as AgentModel) || AgentModel.Sonnet,
        prompt: userPromptVal,
        // New fields
        ...(isLLMModelId && { llmModel: modelStr as LLMModelId }),
        systemPrompt: (def.systemPrompt as string | undefined) ?? '',
        userPrompt: userPromptVal,
        outputMode: ((def.outputMode as string) ?? 'text') as 'text' | 'json',
        ...(def.outputSchema !== undefined && { outputSchema: def.outputSchema as string }),
        ...(def.temperature !== undefined && { temperature: def.temperature as number }),
        ...(def.maxTokens !== undefined && { maxTokens: def.maxTokens as number }),
        ...(def.enableWebSearch !== undefined && { enableWebSearch: def.enableWebSearch as boolean }),
        ...(def.reasoningEffort !== undefined && { reasoningEffort: def.reasoningEffort as 'low' | 'medium' | 'high' }),
        ...(def.apiKey !== undefined && { apiKey: def.apiKey as string }),
        ...(def.resultKey !== undefined && { resultKey: def.resultKey as string }),
        ...(def.throwOnError !== undefined && { throwOnError: def.throwOnError as boolean }),
      };
      break;
    }

    case NodeType.Http:
      label = 'HTTP';
      config = {
        type: 'http',
        url: (def.url as string) ?? '',
        method: ((def.method as string) ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        ...(def.headers !== undefined && { headers: def.headers as Record<string, string> }),
        ...(def.body !== undefined && { body: def.body as string }),
        ...(def.timeout !== undefined && { timeout: def.timeout as number }),
      };
      break;

    case NodeType.DynamicAgent:
      label = 'Dynamic Agent';
      config = {
        type: 'dynamic-agent',
        modelExpression: (def.modelExpression as string) ?? '',
        promptExpression: (def.promptExpression as string) ?? '',
        ...(def.systemExpression !== undefined && { systemExpression: def.systemExpression as string }),
      };
      break;

    case NodeType.DynamicCommand:
      label = 'Dynamic Command';
      config = {
        type: 'dynamic-command',
        commandExpression: (def.commandExpression as string) ?? '',
        ...(def.cwdExpression !== undefined && { cwdExpression: def.cwdExpression as string }),
      };
      break;

    default:
      label = def.name;
      config = {
        type: 'command',
        command: 'echo "Unknown node type"',
      };
  }

  return {
    id: nodeDef.name,
    type: 'workflowNode',
    position,
    data: {
      label,
      nodeType: nodeDef.type,
      config,
    },
  };
}

/**
 * Try to extract the target node name from a transition function
 * This is a best-effort approach since functions can be complex
 */
function extractTransitionTarget(
  transitionFn: (state: { currentNode: string; status: string; updatedAt: string; conversationHistory: unknown[]; context: Record<string, unknown> }) => string,
  allNodeNames: string[]
): string | null {
  // Try to execute with a mock state to get the result
  try {
    const mockState = {
      currentNode: '',
      status: 'pending',
      updatedAt: new Date().toISOString(),
      conversationHistory: [],
      context: {},
    };
    const result = transitionFn(mockState);
    if (allNodeNames.includes(result) || result === SpecialNode.End) {
      return result;
    }
  } catch {
    // Function might need actual state values
  }

  // Try to parse the function source for simple arrow functions
  const fnStr = transitionFn.toString();
  const simpleMatch = fnStr.match(/=>\s*['"`](\w+)['"`]/);
  const matchedValue = simpleMatch?.[1];
  if (matchedValue !== undefined && matchedValue !== null && matchedValue !== '') {
    return matchedValue;
  }

  return null;
}

/**
 * Convert a GraphEngine WorkflowConfig to React Flow nodes and edges
 */
export function fromWorkflowConfig(
  config: WorkflowConfig<string, Record<string, unknown>>
): { nodes: Node<WorkflowNodeData>[]; edges: Edge[] } {
  const nodes: Node<WorkflowNodeData>[] = [];
  const edges: Edge[] = [];
  const allNodeNames = config.nodes.map((n) => n.name);

  // Convert nodes
  for (let i = 0; i < config.nodes.length; i++) {
    const nodeDef = config.nodes[i]!;
    nodes.push(nodeDefToReactFlow(nodeDef, i));
  }

  // Extract edges from transition functions
  for (const nodeDef of config.nodes) {
    // Cast the transition function to the expected signature
    const transitionFn = nodeDef.then as (state: { currentNode: string; status: string; updatedAt: string; conversationHistory: unknown[]; context: Record<string, unknown> }) => string;
    const target = extractTransitionTarget(transitionFn, allNodeNames);
    if (target !== null && target !== undefined && target !== '' && target !== SpecialNode.End) {
      edges.push({
        id: `edge-${nodeDef.name}-${target}`,
        source: nodeDef.name,
        target,
        type: 'workflowEdge',
      });
    }
  }

  return { nodes, edges };
}

// Validation has been moved to ./validation.ts (client-safe)
