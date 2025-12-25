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
} from '@/store/workflow-builder.store';
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
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const updateFn = new Function('state', config.code) as (
        state: unknown
      ) => Partial<Record<string, unknown>>;

      return schema.eval(node.id as TNames, {
        update: updateFn,
        then: transitionFn,
      });
    }

    // TODO: Add support for remaining node types
    case NodeType.Http:
    case NodeType.Llm:
    case NodeType.DynamicAgent:
    case NodeType.DynamicCommand:
    case NodeType.GitHubProject:
      // For now, convert these as command nodes with placeholder
      return schema.command(node.id as TNames, {
        command: `echo "Node type ${data.nodeType} not yet implemented"`,
        then: transitionFn,
      });

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
 * Convert a GraphEngine node definition back to React Flow format
 */
function nodeDefToReactFlow(
  nodeDef: NodeDef<string, Record<string, unknown>>,
  index: number
): Node<WorkflowNodeData> {
  const position = getDefaultPosition(index);
  let config: NodeConfig;
  let label: string;

  switch (nodeDef.type) {
    case NodeType.Agent:
      label = nodeDef.role ?? 'Agent';
      config = {
        type: 'agent',
        role: nodeDef.role,
        prompt: nodeDef.prompt,
        capabilities: (nodeDef.capabilities as StdlibTool[]) ?? [],
        model: nodeDef.model ?? AgentModel.Sonnet,
        ...(nodeDef.maxTurns !== undefined && { maxTurns: nodeDef.maxTurns }),
        ...(nodeDef.temperature !== undefined && { temperature: nodeDef.temperature }),
      };
      break;

    case NodeType.Command:
      label = 'Command';
      config = {
        type: 'command',
        command: nodeDef.command,
        ...(nodeDef.cwd !== undefined && { cwd: nodeDef.cwd }),
        ...(nodeDef.env !== undefined && { env: nodeDef.env }),
        ...(nodeDef.timeout !== undefined && { timeout: nodeDef.timeout }),
        ...(nodeDef.throwOnError !== undefined && { throwOnError: nodeDef.throwOnError }),
      };
      break;

    case NodeType.SlashCommand:
      label = `/${nodeDef.command}`;
      config = {
        type: 'slash-command',
        command: nodeDef.command,
        args: nodeDef.args,
      };
      break;

    case NodeType.Eval:
      label = 'Eval';
      config = {
        type: 'eval',
        code: nodeDef.update.toString(),
      };
      break;

    default:
      label = nodeDef.name;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transitionFn: (state: any) => string,
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
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
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
    const target = extractTransitionTarget(nodeDef.then, allNodeNames);
    if (target && target !== SpecialNode.End) {
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
