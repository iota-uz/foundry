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
  TriggerNodeConfig,
  EndNodeConfig,
  TransitionDef,
} from '@/store/workflow-builder.store';
import type { McpServerSelection } from '@/lib/graph/mcp-presets';
import { NODE_PORT_SCHEMAS } from './port-registry';

// ============================================================================
// Port Data Types
// ============================================================================

/**
 * Mapping of input port to its data source.
 * Key: input port id
 * Value: { nodeId: source node, portId: source output port }
 */
export interface PortMapping {
  sourceNodeId: string;
  sourcePortId: string;
}

/**
 * Port data stored in context for each node's outputs.
 * Structure: __portData[nodeId][portId] = value
 */
export type PortData = Record<string, Record<string, unknown>>;

/**
 * Port mappings for a workflow.
 * Structure: __portMappings[targetNodeId][inputPortId] = { sourceNodeId, sourcePortId }
 */
export type PortMappings = Record<string, Record<string, PortMapping>>;

/**
 * End node mappings stored in context.
 * Maps End node ID to its target status (or undefined for no status change).
 */
export type EndNodeMappings = Record<string, string | undefined>;

/**
 * End node targets stored in context.
 * Maps source node ID to the End node ID it transitions to.
 * Used to determine which End node was reached when workflow completes.
 */
export type EndNodeTargets = Record<string, string>;
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
 * Build port mappings from edges.
 * Extracts sourceHandle and targetHandle to create the mapping.
 */
function buildPortMappings(edges: Edge[]): PortMappings {
  const mappings: PortMappings = {};

  for (const edge of edges) {
    const { source, target, sourceHandle, targetHandle } = edge;

    // Skip edges without handle information
    if (!sourceHandle || !targetHandle) continue;

    // Initialize target node's mappings if needed
    if (!mappings[target]) {
      mappings[target] = {};
    }

    // Map target's input port to source's output port
    mappings[target][targetHandle] = {
      sourceNodeId: source,
      sourcePortId: sourceHandle,
    };
  }

  return mappings;
}

/**
 * Initialize port data from trigger node.
 * The trigger node outputs are populated from initial context.
 */
function initializePortData(
  nodes: Node<WorkflowNodeData>[],
  initialContext: Record<string, unknown>
): PortData {
  const portData: PortData = {};

  // Find the trigger node
  const triggerNode = nodes.find((n) => n.data.nodeType === NodeType.Trigger);
  if (!triggerNode) return portData;

  // Get trigger's port schema
  const triggerSchema = NODE_PORT_SCHEMAS[NodeType.Trigger];
  if (!triggerSchema) return portData;

  // Initialize trigger's output ports from initial context
  const triggerOutputs: Record<string, unknown> = {};
  for (const output of triggerSchema.outputs) {
    // Map port id to context key (e.g., 'title' -> context.title)
    const value = initialContext[output.id];
    if (value !== undefined) {
      triggerOutputs[output.id] = value;
    }
  }
  portData[triggerNode.id] = triggerOutputs;

  return portData;
}

/**
 * Get the target node for a given source node
 * Returns SpecialNode.End if no outgoing edges or if target is an End node
 */
function getNextNode(
  nodeId: string,
  adjacency: Map<string, string[]>,
  endNodeIds: Set<string>
): string {
  const targets = adjacency.get(nodeId);
  if (!targets || targets.length === 0) {
    return SpecialNode.End;
  }
  // For now, just use the first target (single output)
  // TODO: Support conditional routing via edge labels
  const target = targets[0]!;

  // If the target is an End node, return SpecialNode.End instead
  // The End node itself doesn't execute - it's a visual marker
  if (endNodeIds.has(target)) {
    return SpecialNode.End;
  }

  return target;
}

/**
 * Build a transition function from a TransitionDef or fallback to adjacency-based transition.
 * Handles all transition types: simple, conditional, switch, and function.
 */
function buildTransitionFn<TNames extends string>(
  transition: TransitionDef | undefined,
  nodeId: string,
  adjacency: Map<string, string[]>,
  endNodeIds: Set<string>
): (state: { context: Record<string, unknown> }) => TNames {
  // If no transition is defined, use adjacency-based transition
  if (transition === undefined) {
    const nextNodeId = getNextNode(nodeId, adjacency, endNodeIds);
    return () => nextNodeId as TNames;
  }

  switch (transition.type) {
    case 'simple': {
      // Simple transition - always go to target
      const target = endNodeIds.has(transition.target)
        ? SpecialNode.End
        : transition.target;
      return () => target as TNames;
    }

    case 'conditional': {
      // Conditional transition - evaluate condition against context
      const thenTarget = endNodeIds.has(transition.thenTarget)
        ? SpecialNode.End
        : transition.thenTarget;
      const elseTarget = endNodeIds.has(transition.elseTarget)
        ? SpecialNode.End
        : transition.elseTarget;

      return (state) => {
        // Parse the condition as a context property path
        // e.g., "context.testsPassed" -> state.context.testsPassed
        const conditionPath = transition.condition.replace(/^context\./, '');
        const value = getNestedValue(state.context, conditionPath);
        return (value ? thenTarget : elseTarget) as TNames;
      };
    }

    case 'switch': {
      // Switch transition - match expression against cases
      return (state) => {
        const exprPath = transition.expression.replace(/^context\./, '');
        const value = String(getNestedValue(state.context, exprPath));
        const caseTarget = transition.cases[value];

        if (caseTarget !== undefined) {
          return (endNodeIds.has(caseTarget) ? SpecialNode.End : caseTarget) as TNames;
        }

        const defaultTarget = endNodeIds.has(transition.defaultTarget)
          ? SpecialNode.End
          : transition.defaultTarget;
        return defaultTarget as TNames;
      };
    }

    case 'function': {
      // Function transition - evaluate the function source
      // WARNING: This uses eval which can be a security risk.
      // Only use with trusted DSL sources.
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('state', `return (${transition.source})(state);`);
        return (state) => {
          const result = fn(state);
          return (typeof result === 'string' && endNodeIds.has(result)
            ? SpecialNode.End
            : result) as TNames;
        };
      } catch {
        // If function parsing fails, fall back to END
        console.warn(`Failed to parse transition function for node ${nodeId}`);
        return () => SpecialNode.End as TNames;
      }
    }

    default:
      // Unknown transition type, fall back to adjacency
      return () => getNextNode(nodeId, adjacency, endNodeIds) as TNames;
  }
}

/**
 * Get a nested value from an object using dot notation path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Convert a single React Flow node to a GraphEngine node definition
 */
function convertNode<TNames extends string>(
  node: Node<WorkflowNodeData>,
  adjacency: Map<string, string[]>,
  schema: NodeSchema<TNames, Record<string, unknown>>,
  endNodeIds: Set<string>
): NodeDef<TNames, Record<string, unknown>> | null {
  const { data } = node;

  // Build transition function from TransitionDef or adjacency
  const transitionFn = buildTransitionFn<TNames>(
    data.transition,
    node.id,
    adjacency,
    endNodeIds
  );

  switch (data.nodeType) {
    case NodeType.Trigger: {
      // Trigger node is a special entry point - it doesn't execute,
      // it just provides initial data. We skip it in the node list
      // and handle its outputs via __portData initialization.
      return null;
    }

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

    case NodeType.End: {
      // End nodes are virtual terminal points, not actual executable nodes.
      // They are handled by the adjacency map pointing to SpecialNode.End.
      // The End node's targetStatus is captured in __endNodeMappings context.
      return null;
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

  // Separate trigger node, end nodes, and executable nodes
  const triggerNode = nodes.find((n) => n.data.nodeType === NodeType.Trigger);
  const endNodes = nodes.filter((n) => n.data.nodeType === NodeType.End);
  const executableNodes = nodes.filter(
    (n) => n.data.nodeType !== NodeType.Trigger && n.data.nodeType !== NodeType.End
  );

  // Must have at least one executable node (End nodes don't count as they don't execute)
  if (executableNodes.length === 0) {
    return {
      success: false,
      errors: [{ nodeId: '', message: 'Workflow must have at least one executable node' }],
    };
  }

  // Build set of End node IDs for quick lookup
  const endNodeIds = new Set(endNodes.map((n) => n.id));

  // Build End node mappings: End node ID -> targetStatus
  const endNodeMappings: EndNodeMappings = {};
  for (const endNode of endNodes) {
    const config = endNode.data.config as EndNodeConfig;
    endNodeMappings[endNode.id] = config.targetStatus;
  }

  // Build End node targets: source node ID -> End node ID
  // This tells us which End node was reached when a workflow completes
  const endNodeTargets: EndNodeTargets = {};
  for (const edge of edges) {
    if (endNodeIds.has(edge.target)) {
      endNodeTargets[edge.source] = edge.target;
    }
  }

  // Get all node IDs for schema (excluding trigger and end nodes)
  const nodeNames = executableNodes.map((n) => n.id) as readonly string[];

  // Create schema with all node names
  const schema = defineNodes<Record<string, unknown>>()(nodeNames);

  // Build adjacency map for transitions
  const adjacency = buildAdjacencyMap(edges);

  // Build port mappings from edges
  const portMappings = buildPortMappings(edges);

  // Initialize port data from trigger node
  const baseContext = metadata.initialContext ?? {};
  const portData = initializePortData(nodes, baseContext);

  // Convert all executable nodes (End nodes return null and are skipped)
  const nodeDefs: NodeDef<string, Record<string, unknown>>[] = [];

  for (const node of executableNodes) {
    const nodeDef = convertNode(node, adjacency, schema, endNodeIds);
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

  // Build initial context with port data, mappings, and end node info
  const initialContext: Record<string, unknown> = {
    ...baseContext,
    __portData: portData,
    __portMappings: portMappings,
    // End node mappings: End node ID -> targetStatus
    __endNodeMappings: endNodeMappings,
    // End node targets: source node ID -> End node ID (to know which End node was reached)
    __endNodeTargets: endNodeTargets,
    // Include trigger node ID if present for reference
    ...(triggerNode && { __triggerNodeId: triggerNode.id }),
  };

  try {
    const config = defineWorkflow({
      id: metadata.id,
      schema,
      nodes: nodeDefs,
      initialContext,
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

    case NodeType.Trigger:
      // Trigger nodes aren't stored in GraphEngine configs,
      // but handle case for completeness
      label = 'Trigger';
      config = {
        type: 'trigger',
      } as TriggerNodeConfig;
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
