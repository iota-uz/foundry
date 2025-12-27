/**
 * Port Registry
 *
 * Defines fixed port schemas for each node type.
 * These schemas determine what inputs a node accepts
 * and what outputs it produces.
 */

import { NodeType } from '@/lib/graph/enums';
import { PortDataType, type NodePortSchema, type PortDefinition } from './port-types';

/**
 * Port schemas for all node types.
 * Each node type has a fixed set of input and output ports.
 */
export const NODE_PORT_SCHEMAS: Record<NodeType, NodePortSchema> = {
  // ============================================================================
  // Trigger Node (Special - Entry Point)
  // ============================================================================

  [NodeType.Trigger]: {
    inputs: [], // No inputs - this is the entry point
    outputs: [
      {
        id: 'title',
        label: 'Title',
        type: PortDataType.String,
        required: true,
        description: 'Issue or workflow title',
      },
      {
        id: 'description',
        label: 'Description',
        type: PortDataType.String,
        required: true,
        description: 'Detailed description or body text',
      },
      {
        id: 'labels',
        label: 'Labels',
        type: PortDataType.Array,
        required: true,
        description: 'Array of label names',
      },
      {
        id: 'repo',
        label: 'Repository',
        type: PortDataType.String,
        required: true,
        description: 'Repository in owner/repo format',
      },
      {
        id: 'assignee',
        label: 'Assignee',
        type: PortDataType.String,
        required: false,
        description: 'Assigned user login',
      },
      {
        id: 'issueNumber',
        label: 'Issue Number',
        type: PortDataType.Number,
        required: false,
        description: 'GitHub issue number',
      },
      {
        id: 'customFields',
        label: 'Custom Fields',
        type: PortDataType.Object,
        required: false,
        description: 'User-defined custom fields',
      },
    ],
  },

  // ============================================================================
  // AI Nodes
  // ============================================================================

  [NodeType.Agent]: {
    inputs: [
      {
        id: 'prompt',
        label: 'Prompt',
        type: PortDataType.String,
        required: true,
        description: 'The task or question for the agent',
      },
      {
        id: 'context',
        label: 'Context',
        type: PortDataType.Object,
        required: false,
        description: 'Additional context data',
      },
    ],
    outputs: [
      {
        id: 'response',
        label: 'Response',
        type: PortDataType.String,
        required: true,
        description: 'Agent response text',
      },
      {
        id: 'toolResults',
        label: 'Tool Results',
        type: PortDataType.Array,
        required: false,
        description: 'Results from tool executions',
      },
    ],
  },

  [NodeType.Llm]: {
    inputs: [
      {
        id: 'prompt',
        label: 'Prompt',
        type: PortDataType.String,
        required: true,
        description: 'User prompt for the LLM',
      },
      {
        id: 'system',
        label: 'System Prompt',
        type: PortDataType.String,
        required: false,
        description: 'System instructions',
      },
    ],
    outputs: [
      {
        id: 'response',
        label: 'Response',
        type: PortDataType.String,
        required: true,
        description: 'LLM response text',
      },
      {
        id: 'usage',
        label: 'Token Usage',
        type: PortDataType.Object,
        required: false,
        description: 'Token usage statistics',
      },
    ],
  },

  [NodeType.DynamicAgent]: {
    inputs: [
      {
        id: 'config',
        label: 'Configuration',
        type: PortDataType.Object,
        required: true,
        description: 'Dynamic agent configuration',
      },
    ],
    outputs: [
      {
        id: 'response',
        label: 'Response',
        type: PortDataType.String,
        required: true,
        description: 'Agent response text',
      },
    ],
  },

  // ============================================================================
  // Command Nodes
  // ============================================================================

  [NodeType.Command]: {
    inputs: [
      {
        id: 'command',
        label: 'Command',
        type: PortDataType.String,
        required: true,
        description: 'Shell command to execute',
      },
      {
        id: 'env',
        label: 'Environment',
        type: PortDataType.Object,
        required: false,
        description: 'Environment variables',
      },
    ],
    outputs: [
      {
        id: 'stdout',
        label: 'Stdout',
        type: PortDataType.String,
        required: true,
        description: 'Standard output',
      },
      {
        id: 'stderr',
        label: 'Stderr',
        type: PortDataType.String,
        required: true,
        description: 'Standard error output',
      },
      {
        id: 'exitCode',
        label: 'Exit Code',
        type: PortDataType.Number,
        required: true,
        description: 'Process exit code',
      },
      {
        id: 'success',
        label: 'Success',
        type: PortDataType.Boolean,
        required: true,
        description: 'Whether command succeeded (exit 0)',
      },
    ],
  },

  [NodeType.SlashCommand]: {
    inputs: [
      {
        id: 'args',
        label: 'Arguments',
        type: PortDataType.String,
        required: false,
        description: 'Command arguments',
      },
    ],
    outputs: [
      {
        id: 'result',
        label: 'Result',
        type: PortDataType.String,
        required: true,
        description: 'Command execution result',
      },
    ],
  },

  [NodeType.DynamicCommand]: {
    inputs: [
      {
        id: 'config',
        label: 'Configuration',
        type: PortDataType.Object,
        required: true,
        description: 'Dynamic command configuration',
      },
    ],
    outputs: [
      {
        id: 'stdout',
        label: 'Stdout',
        type: PortDataType.String,
        required: true,
        description: 'Standard output',
      },
      {
        id: 'exitCode',
        label: 'Exit Code',
        type: PortDataType.Number,
        required: true,
        description: 'Process exit code',
      },
    ],
  },

  // ============================================================================
  // Utility Nodes
  // ============================================================================

  [NodeType.Eval]: {
    inputs: [
      {
        id: 'input',
        label: 'Input',
        type: PortDataType.Any,
        required: true,
        description: 'Input data to transform',
      },
    ],
    outputs: [
      {
        id: 'result',
        label: 'Result',
        type: PortDataType.Any,
        required: true,
        description: 'Transformed output',
      },
    ],
  },

  // ============================================================================
  // Integration Nodes
  // ============================================================================

  [NodeType.Http]: {
    inputs: [
      {
        id: 'url',
        label: 'URL',
        type: PortDataType.String,
        required: true,
        description: 'Request URL',
      },
      {
        id: 'body',
        label: 'Body',
        type: PortDataType.Object,
        required: false,
        description: 'Request body (for POST/PUT/PATCH)',
      },
      {
        id: 'headers',
        label: 'Headers',
        type: PortDataType.Object,
        required: false,
        description: 'Request headers',
      },
    ],
    outputs: [
      {
        id: 'response',
        label: 'Response',
        type: PortDataType.Object,
        required: true,
        description: 'Response body',
      },
      {
        id: 'status',
        label: 'Status Code',
        type: PortDataType.Number,
        required: true,
        description: 'HTTP status code',
      },
      {
        id: 'responseHeaders',
        label: 'Response Headers',
        type: PortDataType.Object,
        required: false,
        description: 'Response headers',
      },
    ],
  },

  [NodeType.GitCheckout]: {
    inputs: [
      {
        id: 'repo',
        label: 'Repository',
        type: PortDataType.String,
        required: true,
        description: 'Repository in owner/repo format',
      },
      {
        id: 'ref',
        label: 'Git Ref',
        type: PortDataType.String,
        required: false,
        description: 'Branch, tag, or commit SHA',
      },
    ],
    outputs: [
      {
        id: 'path',
        label: 'Checkout Path',
        type: PortDataType.String,
        required: true,
        description: 'Local path to cloned repository',
      },
      {
        id: 'success',
        label: 'Success',
        type: PortDataType.Boolean,
        required: true,
        description: 'Whether checkout succeeded',
      },
    ],
  },

  [NodeType.GitHubProject]: {
    inputs: [
      {
        id: 'issueNumber',
        label: 'Issue Number',
        type: PortDataType.Number,
        required: true,
        description: 'GitHub issue number',
      },
      {
        id: 'fields',
        label: 'Field Updates',
        type: PortDataType.Object,
        required: true,
        description: 'Fields to update on the project item',
      },
    ],
    outputs: [
      {
        id: 'success',
        label: 'Success',
        type: PortDataType.Boolean,
        required: true,
        description: 'Whether update succeeded',
      },
    ],
  },
};

/**
 * Get port schema for a node type.
 *
 * @param nodeType - The node type
 * @returns Port schema with inputs and outputs
 */
export function getNodePortSchema(nodeType: NodeType): NodePortSchema {
  return NODE_PORT_SCHEMAS[nodeType] ?? { inputs: [], outputs: [] };
}

/**
 * Get a specific input port definition.
 *
 * @param nodeType - The node type
 * @param portId - The port identifier
 * @returns Port definition or undefined
 */
export function getInputPort(
  nodeType: NodeType,
  portId: string
): PortDefinition | undefined {
  const schema = getNodePortSchema(nodeType);
  return schema.inputs.find((p) => p.id === portId);
}

/**
 * Get a specific output port definition.
 *
 * @param nodeType - The node type
 * @param portId - The port identifier
 * @returns Port definition or undefined
 */
export function getOutputPort(
  nodeType: NodeType,
  portId: string
): PortDefinition | undefined {
  const schema = getNodePortSchema(nodeType);
  return schema.outputs.find((p) => p.id === portId);
}

/**
 * Get all required input ports for a node type.
 *
 * @param nodeType - The node type
 * @returns Array of required input port definitions
 */
export function getRequiredInputs(nodeType: NodeType): PortDefinition[] {
  const schema = getNodePortSchema(nodeType);
  return schema.inputs.filter((p) => p.required);
}

/**
 * Check if a node type has a specific input port.
 *
 * @param nodeType - The node type
 * @param portId - The port identifier
 * @returns true if the port exists
 */
export function hasInputPort(nodeType: NodeType, portId: string): boolean {
  return getInputPort(nodeType, portId) !== undefined;
}

/**
 * Check if a node type has a specific output port.
 *
 * @param nodeType - The node type
 * @param portId - The port identifier
 * @returns true if the port exists
 */
export function hasOutputPort(nodeType: NodeType, portId: string): boolean {
  return getOutputPort(nodeType, portId) !== undefined;
}
