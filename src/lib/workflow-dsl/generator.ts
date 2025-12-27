/**
 * Workflow DSL Generator
 *
 * Converts React Flow nodes and edges to TypeScript DSL code.
 * Generates human-readable, executable workflow definitions.
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  WorkflowNodeData,
  WorkflowMetadata,
  AgentNodeConfig,
  CommandNodeConfig,
  SlashCommandNodeConfig,
  EvalNodeConfig,
  HttpNodeConfig,
  LlmNodeConfig,
  DynamicAgentNodeConfig,
  DynamicCommandNodeConfig,
  GitHubProjectNodeConfig,
  GitCheckoutNodeConfig,
  TriggerNodeConfig,
} from '@/store/workflow-builder.store';
import { NodeType, StdlibTool } from '@/lib/graph/enums';
import type { GeneratedDSL, TransitionDef, DSLMeta } from './types';
import { AGENT_MODEL_TO_DSL } from './types';
import { serializeTransition, simpleTransition } from './transitions';

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate TypeScript DSL code from React Flow nodes and edges
 */
export function generateDSL(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  metadata: WorkflowMetadata
): GeneratedDSL {
  const warnings: string[] = [];

  // Build adjacency map for edge-based transitions
  const adjacencyMap = buildAdjacencyMap(edges);

  // Find start node (Trigger or first node)
  const startNode = findStartNode(nodes, edges);
  if (!startNode) {
    warnings.push('No start node found, using first node');
  }

  // Build visual metadata
  const meta = buildMeta(nodes, edges);

  // Generate node definitions
  const nodeDefinitions = nodes
    .filter((n) => n.data.nodeType !== NodeType.Trigger)
    .map((node) => generateNodeDefinition(node, adjacencyMap, warnings))
    .join('\n\n');

  // Generate trigger node if present
  const triggerNode = nodes.find((n) => n.data.nodeType === NodeType.Trigger);
  const triggerDefinition = triggerNode
    ? generateTriggerDefinition(triggerNode, adjacencyMap)
    : null;

  // Generate imports
  const imports = generateImports(nodes);

  // Generate context
  const contextStr = formatObject(metadata.initialContext, 2);

  // Combine all parts
  const code = `${imports}

export default defineWorkflow({
  id: '${metadata.id ?? 'untitled'}',
  name: '${escapeString(metadata.name)}',
${metadata.description ? `  description: '${escapeString(metadata.description)}',\n` : ''}
${generateMetaBlock(meta)}
  context: ${contextStr},

  nodes: {
${triggerDefinition ? `${triggerDefinition}\n\n` : ''}${nodeDefinitions}
  },

  start: '${startNode?.data.label ?? 'START'}',
});
`;

  return { code, warnings };
}

// ============================================================================
// Import Generation
// ============================================================================

/**
 * Generate import statements based on node types used
 */
function generateImports(nodes: Node<WorkflowNodeData>[]): string {
  const hasTools = nodes.some(
    (n) =>
      n.data.nodeType === NodeType.Agent &&
      (n.data.config as AgentNodeConfig).capabilities?.length > 0
  );

  const imports = ['defineWorkflow'];
  if (hasTools) {
    imports.push('Tools');
  }

  return `import { ${imports.join(', ')} } from '@foundry/dsl';`;
}

// ============================================================================
// Node Definition Generation
// ============================================================================

/**
 * Generate a single node definition
 */
function generateNodeDefinition(
  node: Node<WorkflowNodeData>,
  adjacencyMap: Map<string, string[]>,
  warnings: string[]
): string {
  const { label, nodeType, config } = node.data;
  const nodeName = sanitizeNodeName(label);

  // Get transition from edges or config
  const transition = getTransitionForNode(node, adjacencyMap);

  switch (nodeType) {
    case NodeType.Agent:
      return generateAgentNode(nodeName, config as AgentNodeConfig, transition);

    case NodeType.Command:
      return generateCommandNode(nodeName, config as CommandNodeConfig, transition);

    case NodeType.SlashCommand:
      return generateSlashCommandNode(nodeName, config as SlashCommandNodeConfig, transition);

    case NodeType.Eval:
      return generateEvalNode(nodeName, config as EvalNodeConfig, transition);

    case NodeType.Http:
      return generateHttpNode(nodeName, config as HttpNodeConfig, transition);

    case NodeType.Llm:
      return generateLlmNode(nodeName, config as LlmNodeConfig, transition);

    case NodeType.DynamicAgent:
      return generateDynamicAgentNode(nodeName, config as DynamicAgentNodeConfig, transition);

    case NodeType.DynamicCommand:
      return generateDynamicCommandNode(nodeName, config as DynamicCommandNodeConfig, transition);

    case NodeType.GitHubProject:
      return generateGitHubProjectNode(nodeName, config as GitHubProjectNodeConfig, transition);

    case NodeType.GitCheckout:
      return generateGitCheckoutNode(nodeName, config as GitCheckoutNodeConfig, transition);

    default:
      warnings.push(`Unknown node type: ${nodeType}`);
      return `    // Unknown node type: ${nodeType}`;
  }
}

/**
 * Generate trigger node definition
 */
function generateTriggerDefinition(
  node: Node<WorkflowNodeData>,
  adjacencyMap: Map<string, string[]>
): string {
  const config = node.data.config as TriggerNodeConfig;
  const transition = getTransitionForNode(node, adjacencyMap);

  const customFieldsStr =
    config.customFields && config.customFields.length > 0
      ? `\n      customFields: ${formatArray(config.customFields, 6)},`
      : '';

  return `    TRIGGER: {
      type: 'trigger',${customFieldsStr}
      then: ${serializeTransition(transition)},
    },`;
}

// ============================================================================
// Node Type Generators
// ============================================================================

function generateAgentNode(
  name: string,
  config: AgentNodeConfig,
  transition: TransitionDef
): string {
  const toolsStr = formatToolsArray(config.capabilities);
  const modelStr = AGENT_MODEL_TO_DSL[config.model] ?? 'sonnet';

  const optionalFields: string[] = [];
  if (config.maxTurns !== undefined) {
    optionalFields.push(`maxTurns: ${config.maxTurns}`);
  }
  if (config.temperature !== undefined) {
    optionalFields.push(`temperature: ${config.temperature}`);
  }
  if (config.mcpServers && config.mcpServers.length > 0) {
    optionalFields.push(`mcpServers: ${formatArray(config.mcpServers, 6)}`);
  }

  const optionalStr =
    optionalFields.length > 0 ? `\n      ${optionalFields.join(',\n      ')},` : '';

  return `    ${name}: {
      type: 'agent',
      role: '${escapeString(config.role)}',
      prompt: '${escapeString(config.prompt)}',
      tools: ${toolsStr},
      model: '${modelStr}',${optionalStr}
      then: ${serializeTransition(transition)},
    },`;
}

function generateCommandNode(
  name: string,
  config: CommandNodeConfig,
  transition: TransitionDef
): string {
  const optionalFields: string[] = [];
  if (config.cwd) {
    optionalFields.push(`cwd: '${escapeString(config.cwd)}'`);
  }
  if (config.env && Object.keys(config.env).length > 0) {
    optionalFields.push(`env: ${formatObject(config.env, 6)}`);
  }
  if (config.timeout !== undefined) {
    optionalFields.push(`timeout: ${config.timeout}`);
  }
  if (config.throwOnError !== undefined) {
    optionalFields.push(`throwOnError: ${config.throwOnError}`);
  }

  const optionalStr =
    optionalFields.length > 0 ? `\n      ${optionalFields.join(',\n      ')},` : '';

  return `    ${name}: {
      type: 'command',
      command: '${escapeString(config.command)}',${optionalStr}
      then: ${serializeTransition(transition)},
    },`;
}

function generateSlashCommandNode(
  name: string,
  config: SlashCommandNodeConfig,
  transition: TransitionDef
): string {
  const argsStr = config.args ? `\n      args: '${escapeString(config.args)}',` : '';

  return `    ${name}: {
      type: 'slash-command',
      command: '${escapeString(config.command)}',${argsStr}
      then: ${serializeTransition(transition)},
    },`;
}

function generateEvalNode(
  name: string,
  config: EvalNodeConfig,
  transition: TransitionDef
): string {
  // Eval code is multiline, use template literal
  const codeStr = `\`${config.code.replace(/`/g, '\\`')}\``;

  return `    ${name}: {
      type: 'eval',
      code: ${codeStr},
      then: ${serializeTransition(transition)},
    },`;
}

function generateHttpNode(
  name: string,
  config: HttpNodeConfig,
  transition: TransitionDef
): string {
  const optionalFields: string[] = [];
  if (config.headers && Object.keys(config.headers).length > 0) {
    optionalFields.push(`headers: ${formatObject(config.headers, 6)}`);
  }
  if (config.body) {
    optionalFields.push(`body: '${escapeString(config.body)}'`);
  }
  if (config.timeout !== undefined) {
    optionalFields.push(`timeout: ${config.timeout}`);
  }

  const optionalStr =
    optionalFields.length > 0 ? `\n      ${optionalFields.join(',\n      ')},` : '';

  return `    ${name}: {
      type: 'http',
      url: '${escapeString(config.url)}',
      method: '${config.method}',${optionalStr}
      then: ${serializeTransition(transition)},
    },`;
}

function generateLlmNode(
  name: string,
  config: LlmNodeConfig,
  transition: TransitionDef
): string {
  const modelStr = AGENT_MODEL_TO_DSL[config.model] ?? 'sonnet';

  const optionalFields: string[] = [];
  if (config.llmModel) {
    optionalFields.push(`llmModel: '${config.llmModel}'`);
  }
  if (config.systemPrompt) {
    optionalFields.push(`systemPrompt: '${escapeString(config.systemPrompt)}'`);
  }
  if (config.userPrompt) {
    optionalFields.push(`userPrompt: '${escapeString(config.userPrompt)}'`);
  }
  if (config.outputMode) {
    optionalFields.push(`outputMode: '${config.outputMode}'`);
  }
  if (config.outputSchema) {
    optionalFields.push(`outputSchema: '${escapeString(config.outputSchema)}'`);
  }
  if (config.temperature !== undefined) {
    optionalFields.push(`temperature: ${config.temperature}`);
  }
  if (config.maxTokens !== undefined) {
    optionalFields.push(`maxTokens: ${config.maxTokens}`);
  }
  if (config.enableWebSearch) {
    optionalFields.push(`enableWebSearch: ${config.enableWebSearch}`);
  }
  if (config.reasoningEffort) {
    optionalFields.push(`reasoningEffort: '${config.reasoningEffort}'`);
  }

  const optionalStr =
    optionalFields.length > 0 ? `\n      ${optionalFields.join(',\n      ')},` : '';

  return `    ${name}: {
      type: 'llm',
      model: '${modelStr}',
      prompt: '${escapeString(config.prompt)}',${optionalStr}
      then: ${serializeTransition(transition)},
    },`;
}

function generateDynamicAgentNode(
  name: string,
  config: DynamicAgentNodeConfig,
  transition: TransitionDef
): string {
  const systemStr = config.systemExpression
    ? `\n      systemExpression: '${escapeString(config.systemExpression)}',`
    : '';

  return `    ${name}: {
      type: 'dynamic-agent',
      modelExpression: '${escapeString(config.modelExpression)}',
      promptExpression: '${escapeString(config.promptExpression)}',${systemStr}
      then: ${serializeTransition(transition)},
    },`;
}

function generateDynamicCommandNode(
  name: string,
  config: DynamicCommandNodeConfig,
  transition: TransitionDef
): string {
  const cwdStr = config.cwdExpression
    ? `\n      cwdExpression: '${escapeString(config.cwdExpression)}',`
    : '';

  return `    ${name}: {
      type: 'dynamic-command',
      commandExpression: '${escapeString(config.commandExpression)}',${cwdStr}
      then: ${serializeTransition(transition)},
    },`;
}

function generateGitHubProjectNode(
  name: string,
  config: GitHubProjectNodeConfig,
  transition: TransitionDef
): string {
  const optionalFields: string[] = [];
  if (config.issueNumber !== undefined) {
    optionalFields.push(`issueNumber: ${config.issueNumber}`);
  }
  if (config.issueNumberKey) {
    optionalFields.push(`issueNumberKey: '${escapeString(config.issueNumberKey)}'`);
  }

  const optionalStr =
    optionalFields.length > 0 ? `\n      ${optionalFields.join(',\n      ')},` : '';

  return `    ${name}: {
      type: 'github-project',
      token: '${escapeString(config.token)}',
      projectOwner: '${escapeString(config.projectOwner)}',
      projectNumber: ${config.projectNumber},
      owner: '${escapeString(config.owner)}',
      repo: '${escapeString(config.repo)}',
      updates: ${formatArray(config.updates, 6)},${optionalStr}
      then: ${serializeTransition(transition)},
    },`;
}

function generateGitCheckoutNode(
  name: string,
  config: GitCheckoutNodeConfig,
  transition: TransitionDef
): string {
  const optionalFields: string[] = [];
  if (config.owner) {
    optionalFields.push(`owner: '${escapeString(config.owner)}'`);
  }
  if (config.repo) {
    optionalFields.push(`repo: '${escapeString(config.repo)}'`);
  }
  if (config.skipIfExists !== undefined) {
    optionalFields.push(`skipIfExists: ${config.skipIfExists}`);
  }

  const optionalStr =
    optionalFields.length > 0 ? `\n      ${optionalFields.join(',\n      ')},` : '';

  return `    ${name}: {
      type: 'git-checkout',
      useIssueContext: ${config.useIssueContext},
      ref: '${escapeString(config.ref)}',
      depth: ${config.depth},${optionalStr}
      then: ${serializeTransition(transition)},
    },`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build adjacency map from edges
 */
function buildAdjacencyMap(edges: Edge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = map.get(edge.source) ?? [];
    existing.push(edge.target);
    map.set(edge.source, existing);
  }
  return map;
}

/**
 * Find the start node (Trigger or first node with no incoming edges)
 */
function findStartNode(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[]
): Node<WorkflowNodeData> | undefined {
  // Prefer Trigger node
  const trigger = nodes.find((n) => n.data.nodeType === NodeType.Trigger);
  if (trigger) return trigger;

  // Find node with no incoming edges
  const targets = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !targets.has(n.id));
}

/**
 * Get transition for a node (from config or edges)
 */
function getTransitionForNode(
  node: Node<WorkflowNodeData>,
  adjacencyMap: Map<string, string[]>
): TransitionDef {
  // Check if node has explicit transition in data
  const nodeData = node.data as WorkflowNodeData & { transition?: TransitionDef };
  if (nodeData.transition) {
    return nodeData.transition;
  }

  // Fall back to edge-based transition
  const targets = adjacencyMap.get(node.id) ?? [];
  if (targets.length === 0) {
    return simpleTransition('END');
  }

  // For single target, use simple transition
  // For multiple targets, this should have been set as a dynamic transition
  const firstTarget = targets[0];
  return simpleTransition(firstTarget ?? 'END');
}

/**
 * Build visual metadata from nodes and edges
 */
function buildMeta(nodes: Node<WorkflowNodeData>[], edges: Edge[]): DSLMeta {
  const meta: DSLMeta = {
    layout: 'manual',
    direction: 'TB',
    nodes: {},
    edges: {},
  };

  // Add node positions
  for (const node of nodes) {
    const nodeName =
      node.data.nodeType === NodeType.Trigger
        ? 'TRIGGER'
        : sanitizeNodeName(node.data.label);
    meta.nodes![nodeName] = {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    };
  }

  // Add edge metadata (only if there's custom data)
  for (const edge of edges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (sourceNode && targetNode && edge.data) {
      const sourceName =
        sourceNode.data.nodeType === NodeType.Trigger
          ? 'TRIGGER'
          : sanitizeNodeName(sourceNode.data.label);
      const targetName =
        targetNode.data.nodeType === NodeType.Trigger
          ? 'TRIGGER'
          : sanitizeNodeName(targetNode.data.label);
      const edgeData = edge.data as { label?: string; animated?: boolean };
      if (edgeData.label || edgeData.animated) {
        meta.edges![`${sourceName}->${targetName}`] = {
          ...(edgeData.label && { label: edgeData.label }),
          ...(edgeData.animated && { animated: edgeData.animated }),
        };
      }
    }
  }

  return meta;
}

/**
 * Generate the _meta block
 */
function generateMetaBlock(meta: DSLMeta): string {
  const nodesStr = Object.entries(meta.nodes ?? {})
    .map(([name, pos]) => `      ${name}: { x: ${pos.x}, y: ${pos.y} }`)
    .join(',\n');

  const edgesEntries = Object.entries(meta.edges ?? {});
  const edgesStr =
    edgesEntries.length > 0
      ? edgesEntries
          .map(
            ([key, data]) =>
              `      '${key}': { ${Object.entries(data)
                .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`)
                .join(', ')} }`
          )
          .join(',\n')
      : '';

  return `  _meta: {
    layout: '${meta.layout ?? 'manual'}',
    direction: '${meta.direction ?? 'TB'}',
    nodes: {
${nodesStr}
    },${edgesStr ? `\n    edges: {\n${edgesStr}\n    },` : ''}
  },
`;
}

/**
 * Sanitize a node name for use as object key
 */
function sanitizeNodeName(name: string): string {
  // Convert to UPPER_SNAKE_CASE
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Format tools array
 */
function formatToolsArray(tools: StdlibTool[]): string {
  if (tools.length === 0) return '[]';

  const toolNames = tools.map((t) => `Tools.${t}`);
  if (toolNames.length <= 3) {
    return `[${toolNames.join(', ')}]`;
  }

  return `[\n        ${toolNames.join(',\n        ')}\n      ]`;
}

/**
 * Format an object as indented JSON-like code
 */
function formatObject(obj: Record<string, unknown>, indent: number): string {
  if (Object.keys(obj).length === 0) return '{}';

  const spaces = ' '.repeat(indent);
  const entries = Object.entries(obj)
    .map(([key, value]) => `${spaces}  ${key}: ${formatValue(value, indent + 2)}`)
    .join(',\n');

  return `{\n${entries}\n${spaces}}`;
}

/**
 * Format an array as indented code
 */
function formatArray(arr: unknown[], indent: number): string {
  if (arr.length === 0) return '[]';

  const spaces = ' '.repeat(indent);
  const items = arr.map((item) => `${spaces}  ${formatValue(item, indent + 2)}`).join(',\n');

  return `[\n${items}\n${spaces}]`;
}

/**
 * Format a value for code output
 */
function formatValue(value: unknown, indent: number): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  switch (typeof value) {
    case 'string':
      return `'${escapeString(value)}'`;
    case 'number':
    case 'boolean':
      return String(value);
    case 'object':
      if (Array.isArray(value)) {
        return formatArray(value, indent);
      }
      return formatObject(value as Record<string, unknown>, indent);
    default:
      return String(value);
  }
}

/**
 * Escape special characters in strings
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
