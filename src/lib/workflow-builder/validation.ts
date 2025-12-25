/**
 * Workflow Validation (Client-safe)
 *
 * Validation functions that can run in the browser.
 * Does not import from @/lib/graph to avoid server-only dependencies.
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  WorkflowNodeData,
  NodeConfig,
} from '@/store/workflow-builder.store';
import { NodeType } from '@/lib/graph/enums';

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  nodeId: string;
  message: string;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a workflow for execution readiness
 */
export function validateWorkflow(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (nodes.length === 0) {
    errors.push({ nodeId: '', message: 'Workflow must have at least one node' });
    return errors;
  }

  // Check for disconnected nodes (except the last node which can have no output)
  const nodeIds = new Set(nodes.map((n) => n.id));
  const nodesWithIncoming = new Set(edges.map((e) => e.target));

  // Find entry nodes (no incoming edges)
  const entryNodes = nodes.filter((n) => !nodesWithIncoming.has(n.id));
  if (entryNodes.length === 0 && nodes.length > 1) {
    errors.push({ nodeId: '', message: 'Workflow has no entry point (circular dependency)' });
  }
  if (entryNodes.length > 1) {
    errors.push({
      nodeId: '',
      message: `Multiple entry points found: ${entryNodes.map((n) => n.data.label).join(', ')}`,
    });
  }

  // Check for invalid edge references
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({ nodeId: edge.source, message: `Edge source node not found: ${edge.source}` });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({ nodeId: edge.target, message: `Edge target node not found: ${edge.target}` });
    }
  }

  // Validate node configurations
  for (const node of nodes) {
    const configErrors = validateNodeConfig(node.id, node.data.nodeType, node.data.config);
    errors.push(...configErrors);
  }

  return errors;
}

/**
 * Validate a single node's configuration
 */
function validateNodeConfig(
  nodeId: string,
  nodeType: NodeType,
  config: NodeConfig
): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (nodeType) {
    case NodeType.Agent:
      if (config.type === 'agent') {
        if (!config.prompt?.trim()) {
          errors.push({ nodeId, message: 'Agent node requires a prompt' });
        }
        if (!config.role?.trim()) {
          errors.push({ nodeId, message: 'Agent node requires a role' });
        }
      }
      break;

    case NodeType.Command:
      if (config.type === 'command') {
        if (!config.command?.trim()) {
          errors.push({ nodeId, message: 'Command node requires a command' });
        }
      }
      break;

    case NodeType.SlashCommand:
      if (config.type === 'slash-command') {
        if (!config.command?.trim()) {
          errors.push({ nodeId, message: 'Slash command node requires a command name' });
        }
      }
      break;

    case NodeType.Eval:
      if (config.type === 'eval') {
        if (!config.code?.trim()) {
          errors.push({ nodeId, message: 'Eval node requires code' });
        }
        // Try to parse the code
        try {
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          new Function('state', config.code);
        } catch (e) {
          errors.push({
            nodeId,
            message: `Invalid eval code: ${e instanceof Error ? e.message : 'syntax error'}`,
          });
        }
      }
      break;
  }

  return errors;
}
