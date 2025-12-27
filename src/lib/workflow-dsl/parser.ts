/**
 * Workflow DSL Parser
 *
 * Parses TypeScript DSL code back to React Flow nodes and edges.
 * Uses ts-morph for reliable TypeScript AST parsing.
 */

import { Project, SyntaxKind, type ObjectLiteralExpression } from 'ts-morph';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowMetadata } from '@/store/workflow-builder.store';
import { AgentModel } from '@/lib/graph/enums';
import type {
  DSLWorkflow,
  DSLNode,
  DSLMeta,
  ParsedWorkflow,
  TransitionDef,
} from './types';
import { DSL_TO_NODE_TYPE, DSL_TO_AGENT_MODEL } from './types';
import { parseFunctionTransition } from './transitions';

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse TypeScript DSL code into a workflow definition
 */
export function parseDSL(code: string): ParsedWorkflow {
  const warnings: string[] = [];

  // Create ts-morph project with in-memory file
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile('workflow.ts', code);

  // Find the defineWorkflow call
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  const defineWorkflowCall = callExpressions.find((call) => {
    const expr = call.getExpression();
    return expr.getText() === 'defineWorkflow';
  });

  if (!defineWorkflowCall) {
    throw new Error('No defineWorkflow() call found in code');
  }

  // Get the argument (should be an object literal)
  const args = defineWorkflowCall.getArguments();
  if (args.length === 0) {
    throw new Error('defineWorkflow() requires an argument');
  }

  const arg = args[0];
  if (!arg || arg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error('defineWorkflow() argument must be an object literal');
  }

  // Extract workflow properties
  const workflow = extractWorkflowFromObject(arg as ObjectLiteralExpression, warnings);

  return { workflow, warnings };
}

/**
 * Extract workflow definition from object literal
 */
function extractWorkflowFromObject(
  obj: ObjectLiteralExpression,
  warnings: string[]
): DSLWorkflow {
  const properties = obj.getProperties();

  let id = 'untitled';
  let name: string | undefined;
  let description: string | undefined;
  let meta: DSLMeta | undefined;
  let context: Record<string, unknown> = {};
  let nodes: Record<string, DSLNode> = {};
  let start = 'START';

  for (const prop of properties) {
    if (!('getName' in prop) || typeof prop.getName !== 'function') continue;

    const propName = prop.getName();
    const initializer = 'getInitializer' in prop && typeof prop.getInitializer === 'function'
      ? prop.getInitializer()
      : undefined;

    if (!initializer) continue;

    switch (propName) {
      case 'id':
        id = extractStringValue(initializer) ?? 'untitled';
        break;
      case 'name':
        name = extractStringValue(initializer) ?? undefined;
        break;
      case 'description':
        description = extractStringValue(initializer) ?? undefined;
        break;
      case '_meta':
        meta = extractMeta(initializer);
        break;
      case 'context':
        context = extractObjectValue(initializer) ?? {};
        break;
      case 'nodes':
        nodes = extractNodes(initializer, warnings);
        break;
      case 'start':
        start = extractStringValue(initializer) ?? 'START';
        break;
    }
  }

  const workflow: DSLWorkflow = { id, context, nodes, start };
  if (name) workflow.name = name;
  if (description) workflow.description = description;
  if (meta) workflow._meta = meta;

  return workflow;
}

// ============================================================================
// Property Extractors
// ============================================================================

/**
 * Extract string value from AST node
 */
function extractStringValue(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null;

  const tsNode = node as { getKind?(): number; getLiteralText?(): string; getText?(): string };

  if (tsNode.getKind?.() === SyntaxKind.StringLiteral && tsNode.getLiteralText) {
    return tsNode.getLiteralText();
  }

  // Handle template literals
  if (tsNode.getKind?.() === SyntaxKind.TemplateExpression && tsNode.getText) {
    const text = tsNode.getText();
    // Remove backticks and unescape
    return text.slice(1, -1).replace(/\\`/g, '`');
  }

  return null;
}

/**
 * Extract number value from AST node
 */
function extractNumberValue(node: unknown): number | null {
  if (!node || typeof node !== 'object') return null;

  const tsNode = node as { getKind?(): number; getLiteralText?(): string };

  if (tsNode.getKind?.() === SyntaxKind.NumericLiteral && tsNode.getLiteralText) {
    return Number(tsNode.getLiteralText());
  }

  return null;
}

/**
 * Extract boolean value from AST node
 */
function extractBooleanValue(node: unknown): boolean | null {
  if (!node || typeof node !== 'object') return null;

  const tsNode = node as { getKind?(): number };

  if (tsNode.getKind?.() === SyntaxKind.TrueKeyword) return true;
  if (tsNode.getKind?.() === SyntaxKind.FalseKeyword) return false;

  return null;
}

/**
 * Extract object value from AST node
 */
function extractObjectValue(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;

  const tsNode = node as { getKind?(): number; getProperties?(): unknown[] };

  if (tsNode.getKind?.() !== SyntaxKind.ObjectLiteralExpression) return null;

  const result: Record<string, unknown> = {};
  const properties = tsNode.getProperties?.() ?? [];

  for (const prop of properties) {
    const propObj = prop as { getName?(): string; getInitializer?(): unknown };
    if (!propObj.getName || !propObj.getInitializer) continue;

    const name = propObj.getName();
    const init = propObj.getInitializer();
    result[name] = extractAnyValue(init);
  }

  return result;
}

/**
 * Extract array value from AST node
 */
function extractArrayValue(node: unknown): unknown[] | null {
  if (!node || typeof node !== 'object') return null;

  const tsNode = node as { getKind?(): number; getElements?(): unknown[] };

  if (tsNode.getKind?.() !== SyntaxKind.ArrayLiteralExpression) return null;

  const elements = tsNode.getElements?.() ?? [];
  return elements.map(extractAnyValue);
}

/**
 * Extract any value from AST node
 */
function extractAnyValue(node: unknown): unknown {
  const str = extractStringValue(node);
  if (str !== null) return str;

  const num = extractNumberValue(node);
  if (num !== null) return num;

  const bool = extractBooleanValue(node);
  if (bool !== null) return bool;

  const arr = extractArrayValue(node);
  if (arr !== null) return arr;

  const obj = extractObjectValue(node);
  if (obj !== null) return obj;

  return null;
}

// ============================================================================
// Meta Extractor
// ============================================================================

/**
 * Extract _meta block
 */
function extractMeta(node: unknown): DSLMeta | undefined {
  const obj = extractObjectValue(node);
  if (!obj) return undefined;

  const meta: DSLMeta = {};

  if (obj.layout) meta.layout = obj.layout as 'dagre' | 'manual';
  if (obj.direction) meta.direction = obj.direction as 'LR' | 'TB';
  if (obj.viewport) {
    const vp = obj.viewport as { x: number; y: number; zoom: number };
    meta.viewport = { x: vp.x, y: vp.y, zoom: vp.zoom };
  }
  if (obj.nodes) {
    meta.nodes = obj.nodes as Record<string, { x: number; y: number; color?: string; collapsed?: boolean }>;
  }
  if (obj.edges) {
    meta.edges = obj.edges as Record<string, { label?: string; animated?: boolean; style?: 'bezier' | 'step' | 'straight' }>;
  }

  return meta;
}

// ============================================================================
// Nodes Extractor
// ============================================================================

/**
 * Extract nodes object
 */
function extractNodes(node: unknown, warnings: string[]): Record<string, DSLNode> {
  if (!node || typeof node !== 'object') return {};

  const tsNode = node as { getKind?(): number; getProperties?(): unknown[] };

  if (tsNode.getKind?.() !== SyntaxKind.ObjectLiteralExpression) return {};

  const result: Record<string, DSLNode> = {};
  const properties = tsNode.getProperties?.() ?? [];

  for (const prop of properties) {
    const propObj = prop as { getName?(): string; getInitializer?(): unknown };
    if (!propObj.getName || !propObj.getInitializer) continue;

    const nodeName = propObj.getName();
    const nodeInit = propObj.getInitializer();

    const dslNode = extractNodeConfig(nodeInit, nodeName, warnings);
    if (dslNode) {
      result[nodeName] = dslNode;
    }
  }

  return result;
}

/**
 * Extract a single node configuration
 */
function extractNodeConfig(
  node: unknown,
  nodeName: string,
  warnings: string[]
): DSLNode | null {
  const obj = extractObjectValue(node);
  if (!obj) {
    warnings.push(`Could not parse node: ${nodeName}`);
    return null;
  }

  const nodeType = obj.type as string;
  if (!nodeType) {
    warnings.push(`Node ${nodeName} missing type`);
    return null;
  }

  // Extract transition
  const transition = extractTransition(node);

  // Build node based on type
  switch (nodeType) {
    case 'trigger':
      return {
        type: 'trigger',
        customFields: obj.customFields as DSLNode['type'] extends 'trigger' ? (typeof obj)['customFields'] : never,
        then: transition.type === 'simple' ? transition.target : (obj.then as string) ?? 'END',
      } as DSLNode;

    case 'agent':
      return {
        type: 'agent',
        role: obj.role as string ?? '',
        prompt: obj.prompt as string ?? '',
        tools: extractToolsArray(obj.tools) ?? [],
        model: (obj.model as 'haiku' | 'sonnet' | 'opus') ?? 'sonnet',
        maxTurns: obj.maxTurns as number | undefined,
        temperature: obj.temperature as number | undefined,
        mcpServers: obj.mcpServers as unknown[] | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'command':
      return {
        type: 'command',
        command: obj.command as string ?? '',
        cwd: obj.cwd as string | undefined,
        env: obj.env as Record<string, string> | undefined,
        timeout: obj.timeout as number | undefined,
        throwOnError: obj.throwOnError as boolean | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'slash-command':
      return {
        type: 'slash-command',
        command: obj.command as string ?? '',
        args: obj.args as string | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'eval':
      return {
        type: 'eval',
        code: obj.code as string ?? '',
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'http':
      return {
        type: 'http',
        url: obj.url as string ?? '',
        method: (obj.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH') ?? 'GET',
        headers: obj.headers as Record<string, string> | undefined,
        body: obj.body as string | undefined,
        timeout: obj.timeout as number | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'llm':
      return {
        type: 'llm',
        model: (obj.model as 'haiku' | 'sonnet' | 'opus') ?? 'sonnet',
        prompt: obj.prompt as string ?? '',
        llmModel: obj.llmModel as string | undefined,
        systemPrompt: obj.systemPrompt as string | undefined,
        userPrompt: obj.userPrompt as string | undefined,
        outputMode: obj.outputMode as 'text' | 'json' | undefined,
        temperature: obj.temperature as number | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'dynamic-agent':
      return {
        type: 'dynamic-agent',
        modelExpression: obj.modelExpression as string ?? '',
        promptExpression: obj.promptExpression as string ?? '',
        systemExpression: obj.systemExpression as string | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'dynamic-command':
      return {
        type: 'dynamic-command',
        commandExpression: obj.commandExpression as string ?? '',
        cwdExpression: obj.cwdExpression as string | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'github-project':
      return {
        type: 'github-project',
        token: obj.token as string ?? '',
        projectOwner: obj.projectOwner as string ?? '',
        projectNumber: obj.projectNumber as number ?? 1,
        owner: obj.owner as string ?? '',
        repo: obj.repo as string ?? '',
        updates: obj.updates as unknown[] ?? [],
        issueNumber: obj.issueNumber as number | undefined,
        issueNumberKey: obj.issueNumberKey as string | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    case 'git-checkout':
      return {
        type: 'git-checkout',
        useIssueContext: obj.useIssueContext as boolean ?? true,
        owner: obj.owner as string | undefined,
        repo: obj.repo as string | undefined,
        ref: obj.ref as string ?? 'main',
        depth: obj.depth as number ?? 1,
        skipIfExists: obj.skipIfExists as boolean | undefined,
        then: formatTransitionForDSL(transition),
      } as DSLNode;

    default:
      warnings.push(`Unknown node type: ${nodeType}`);
      return null;
  }
}

/**
 * Extract tools array (handles Tools.Read, Tools.Write, etc.)
 */
function extractToolsArray(node: unknown): string[] | null {
  if (!node || typeof node !== 'object') return null;

  const tsNode = node as { getKind?(): number; getElements?(): unknown[] };

  if (tsNode.getKind?.() !== SyntaxKind.ArrayLiteralExpression) return null;

  const elements = tsNode.getElements?.() ?? [];
  const tools: string[] = [];

  for (const elem of elements) {
    const elemNode = elem as { getText?(): string };
    const text = elemNode.getText?.();
    if (text) {
      // Extract tool name from "Tools.Read" -> "Read"
      const match = text.match(/Tools\.(\w+)/);
      if (match?.[1]) {
        tools.push(match[1]);
      }
    }
  }

  return tools;
}

/**
 * Extract transition from node
 */
function extractTransition(node: unknown): TransitionDef {
  if (!node || typeof node !== 'object') {
    return { type: 'simple', target: 'END' };
  }

  const tsNode = node as { getKind?(): number; getProperties?(): unknown[] };

  if (tsNode.getKind?.() !== SyntaxKind.ObjectLiteralExpression) {
    return { type: 'simple', target: 'END' };
  }

  const properties = tsNode.getProperties?.() ?? [];

  // Find 'then' property
  for (const prop of properties) {
    const propObj = prop as { getName?(): string; getInitializer?(): unknown };
    if (propObj.getName?.() !== 'then') continue;

    const init = propObj.getInitializer?.();
    if (!init) continue;

    const initNode = init as { getKind?(): number; getText?(): string };

    // String literal - simple transition
    if (initNode.getKind?.() === SyntaxKind.StringLiteral) {
      return { type: 'simple', target: extractStringValue(init) ?? 'END' };
    }

    // Arrow function - function transition
    if (initNode.getKind?.() === SyntaxKind.ArrowFunction) {
      return parseFunctionTransition(initNode.getText?.() ?? '');
    }

    // Object literal - conditional or switch
    if (initNode.getKind?.() === SyntaxKind.ObjectLiteralExpression) {
      const obj = extractObjectValue(init);
      if (obj) {
        // Conditional
        if ('if' in obj) {
          return {
            type: 'conditional',
            condition: obj.if as string ?? '',
            thenTarget: obj.then as string ?? 'END',
            elseTarget: obj.else as string ?? 'END',
          };
        }
        // Switch
        if ('match' in obj) {
          return {
            type: 'switch',
            expression: obj.match as string ?? '',
            cases: obj.cases as Record<string, string> ?? {},
            defaultTarget: obj.default as string ?? 'END',
          };
        }
      }
    }
  }

  return { type: 'simple', target: 'END' };
}

/**
 * Format transition for DSL output
 */
function formatTransitionForDSL(transition: TransitionDef): string | object {
  switch (transition.type) {
    case 'simple':
      return transition.target;
    case 'conditional':
      return {
        if: transition.condition,
        then: transition.thenTarget,
        else: transition.elseTarget,
      };
    case 'switch':
      return {
        match: transition.expression,
        cases: transition.cases,
        default: transition.defaultTarget,
      };
    case 'function':
      // Return raw source - will be preserved as-is
      return transition.source;
  }
}

// ============================================================================
// Convert to React Flow
// ============================================================================

/**
 * Convert parsed DSL workflow to React Flow nodes and edges
 * @param workflow - The parsed DSL workflow definition
 * @param projectId - Optional project ID (required for saving, can be provided later)
 */
export function dslToReactFlow(
  workflow: DSLWorkflow,
  projectId = ''
): { nodes: Node<WorkflowNodeData>[]; edges: Edge[]; metadata: WorkflowMetadata } {
  const nodes: Node<WorkflowNodeData>[] = [];
  const edges: Edge[] = [];
  const nodeIdMap = new Map<string, string>();

  // Get positions from meta or auto-layout
  const positions = workflow._meta?.nodes ?? {};
  let yOffset = 0;
  const xBase = 100;
  const ySpacing = 150;

  // Create nodes
  for (const [nodeName, dslNode] of Object.entries(workflow.nodes)) {
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    nodeIdMap.set(nodeName, nodeId);

    const position = positions[nodeName] ?? { x: xBase, y: yOffset };
    yOffset += ySpacing;

    const nodeType = DSL_TO_NODE_TYPE[dslNode.type];
    if (!nodeType) continue;

    const config = dslNodeToConfig(dslNode);

    nodes.push({
      id: nodeId,
      type: 'workflowNode',
      position: { x: position.x, y: position.y },
      data: {
        label: nodeName,
        nodeType,
        config,
      },
    });
  }

  // Create edges from transitions
  for (const [nodeName, dslNode] of Object.entries(workflow.nodes)) {
    const sourceId = nodeIdMap.get(nodeName);
    if (!sourceId) continue;

    const targets = getTransitionTargets(dslNode);
    for (const target of targets) {
      if (target === 'END') continue;

      const targetId = nodeIdMap.get(target);
      if (!targetId) continue;

      edges.push({
        id: `edge-${sourceId}-${targetId}-${Date.now()}`,
        source: sourceId,
        target: targetId,
        type: 'workflowEdge',
      });
    }
  }

  // Build metadata
  const metadata: WorkflowMetadata = {
    id: workflow.id,
    projectId,
    name: workflow.name ?? workflow.id,
    description: workflow.description ?? '',
    initialContext: workflow.context,
  };

  return { nodes, edges, metadata };
}

/**
 * Convert DSL node to store config
 */
function dslNodeToConfig(node: DSLNode): WorkflowNodeData['config'] {
  switch (node.type) {
    case 'trigger': {
      const config: { type: 'trigger'; customFields?: Array<{ id: string; name: string; type: string; description?: string; defaultValue?: unknown }> } = {
        type: 'trigger',
      };
      if (node.customFields) {
        config.customFields = node.customFields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          ...(f.description ? { description: f.description } : {}),
          ...(f.defaultValue !== undefined ? { defaultValue: f.defaultValue } : {}),
        }));
      }
      return config as WorkflowNodeData['config'];
    }

    case 'agent': {
      const config: Record<string, unknown> = {
        type: 'agent',
        role: node.role,
        prompt: node.prompt,
        capabilities: node.tools ?? [],
        model: DSL_TO_AGENT_MODEL[node.model] ?? AgentModel.Sonnet,
      };
      if (node.maxTurns !== undefined) config.maxTurns = node.maxTurns;
      if (node.temperature !== undefined) config.temperature = node.temperature;
      if (node.mcpServers) config.mcpServers = node.mcpServers;
      return config as unknown as WorkflowNodeData['config'];
    }

    case 'command': {
      const config: Record<string, unknown> = {
        type: 'command',
        command: node.command,
      };
      if (node.cwd) config.cwd = node.cwd;
      if (node.env) config.env = node.env;
      if (node.timeout !== undefined) config.timeout = node.timeout;
      if (node.throwOnError !== undefined) config.throwOnError = node.throwOnError;
      return config as unknown as WorkflowNodeData['config'];
    }

    case 'slash-command':
      return {
        type: 'slash-command',
        command: node.command,
        args: node.args ?? '',
      };

    case 'eval':
      return {
        type: 'eval',
        code: node.code,
      };

    case 'http': {
      const config: Record<string, unknown> = {
        type: 'http',
        url: node.url,
        method: node.method,
      };
      if (node.headers) config.headers = node.headers;
      if (node.body) config.body = node.body;
      if (node.timeout !== undefined) config.timeout = node.timeout;
      return config as unknown as WorkflowNodeData['config'];
    }

    case 'llm': {
      const config: Record<string, unknown> = {
        type: 'llm',
        model: DSL_TO_AGENT_MODEL[node.model] ?? AgentModel.Sonnet,
        prompt: node.prompt,
      };
      if (node.llmModel) config.llmModel = node.llmModel;
      if (node.systemPrompt) config.systemPrompt = node.systemPrompt;
      if (node.userPrompt) config.userPrompt = node.userPrompt;
      if (node.outputMode) config.outputMode = node.outputMode;
      if (node.temperature !== undefined) config.temperature = node.temperature;
      return config as unknown as WorkflowNodeData['config'];
    }

    case 'dynamic-agent': {
      const config: Record<string, unknown> = {
        type: 'dynamic-agent',
        modelExpression: node.modelExpression,
        promptExpression: node.promptExpression,
      };
      if (node.systemExpression) config.systemExpression = node.systemExpression;
      return config as unknown as WorkflowNodeData['config'];
    }

    case 'dynamic-command': {
      const config: Record<string, unknown> = {
        type: 'dynamic-command',
        commandExpression: node.commandExpression,
      };
      if (node.cwdExpression) config.cwdExpression = node.cwdExpression;
      return config as unknown as WorkflowNodeData['config'];
    }

    case 'github-project': {
      const config: Record<string, unknown> = {
        type: 'github-project',
        token: node.token,
        projectOwner: node.projectOwner,
        projectNumber: node.projectNumber,
        owner: node.owner,
        repo: node.repo,
        updates: node.updates,
      };
      if (node.issueNumber !== undefined) config.issueNumber = node.issueNumber;
      if (node.issueNumberKey) config.issueNumberKey = node.issueNumberKey;
      return config as unknown as WorkflowNodeData['config'];
    }

    case 'git-checkout': {
      const config: Record<string, unknown> = {
        type: 'git-checkout',
        useIssueContext: node.useIssueContext,
        ref: node.ref,
        depth: node.depth,
      };
      if (node.owner) config.owner = node.owner;
      if (node.repo) config.repo = node.repo;
      if (node.skipIfExists !== undefined) config.skipIfExists = node.skipIfExists;
      return config as unknown as WorkflowNodeData['config'];
    }
  }
}

/**
 * Get all transition targets from a DSL node
 */
function getTransitionTargets(node: DSLNode): string[] {
  const then = node.then;

  // String - simple transition
  if (typeof then === 'string') {
    return [then];
  }

  // Object - conditional or switch
  if (typeof then === 'object' && then !== null) {
    const obj = then as Record<string, unknown>;

    // Conditional
    if ('if' in obj) {
      return [obj.then as string, obj.else as string].filter(Boolean);
    }

    // Switch
    if ('match' in obj) {
      const cases = obj.cases as Record<string, string> | undefined;
      const targets = cases ? Object.values(cases) : [];
      if (obj.default) targets.push(obj.default as string);
      return targets;
    }
  }

  return [];
}
