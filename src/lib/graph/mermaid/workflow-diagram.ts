/**
 * @sys/graph/mermaid - Workflow Diagram Generator
 *
 * Generates Mermaid stateDiagram-v2 diagrams for workflow visualization.
 * Supports node styling based on execution status.
 */

/**
 * Node status for styling purposes.
 */
export type NodeStatus = 'pending' | 'active' | 'completed' | 'failed';

/**
 * Node metadata for diagram generation.
 */
export interface DiagramNode {
  /** Node identifier (used in diagram) */
  id: string;

  /** Display label (optional, defaults to id) */
  label?: string;

  /** Current execution status */
  status: NodeStatus;
}

/**
 * Edge between nodes in the diagram.
 */
export interface DiagramEdge {
  /** Source node ID */
  from: string;

  /** Target node ID */
  to: string;

  /** Optional edge label */
  label?: string;
}

/**
 * Configuration for workflow diagram generation.
 */
export interface WorkflowDiagramConfig {
  /** All nodes in the workflow */
  nodes: DiagramNode[];

  /** Edges between nodes */
  edges: DiagramEdge[];

  /** Currently active node (for highlighting) */
  activeNode?: string;

  /** Direction of the diagram */
  direction?: 'TB' | 'LR';
}

/**
 * Color themes for node statuses.
 */
const STATUS_STYLES: Record<NodeStatus, { fill: string; stroke: string; color: string }> = {
  pending: { fill: '#e5e7eb', stroke: '#6b7280', color: '#374151' },
  active: { fill: '#fef3c7', stroke: '#f59e0b', color: '#92400e' },
  completed: { fill: '#d1fae5', stroke: '#10b981', color: '#065f46' },
  failed: { fill: '#fee2e2', stroke: '#ef4444', color: '#991b1b' },
};

/**
 * Escapes special characters in Mermaid labels.
 */
function escapeLabel(label: string): string {
  // Mermaid uses specific syntax, escape special chars
  return label
    .replace(/"/g, '\\"')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Generates a Mermaid stateDiagram-v2 for a workflow.
 *
 * @param config - Diagram configuration
 * @returns Mermaid diagram code (without code fence)
 *
 * @example
 * ```typescript
 * const diagram = generateWorkflowDiagram({
 *   nodes: [
 *     { id: 'PLAN', status: 'completed' },
 *     { id: 'BUILD', status: 'active' },
 *     { id: 'QA', status: 'pending' },
 *   ],
 *   edges: [
 *     { from: 'PLAN', to: 'BUILD' },
 *     { from: 'BUILD', to: 'QA' },
 *   ],
 *   activeNode: 'BUILD',
 * });
 * ```
 */
export function generateWorkflowDiagram(config: WorkflowDiagramConfig): string {
  const { nodes, edges, activeNode, direction = 'LR' } = config;

  const lines: string[] = [];

  // Diagram header
  lines.push('stateDiagram-v2');
  if (direction === 'LR') {
    lines.push('    direction LR');
  }

  // Add start transition if there are nodes
  const startNode = nodes.find((n) => !edges.some((e) => e.to === n.id));
  if (startNode) {
    lines.push(`    [*] --> ${startNode.id}`);
  }

  // Add edges
  for (const edge of edges) {
    if (edge.to === 'END') {
      const labelPart = (edge.label !== undefined && edge.label !== null && edge.label !== '')
        ? ` : ${escapeLabel(edge.label)}`
        : '';
      lines.push(`    ${edge.from} --> [*]${labelPart}`);
    } else {
      const labelPart = (edge.label !== undefined && edge.label !== null && edge.label !== '')
        ? ` : ${escapeLabel(edge.label)}`
        : '';
      lines.push(`    ${edge.from} --> ${edge.to}${labelPart}`);
    }
  }

  // Add node descriptions (for custom labels)
  for (const node of nodes) {
    if (node.label !== undefined && node.label !== null && node.label !== '' && node.label !== node.id) {
      lines.push(`    ${node.id} : ${escapeLabel(node.label)}`);
    }
  }

  // Add style classes
  lines.push('');
  lines.push('    %% Status styling');
  for (const [status, style] of Object.entries(STATUS_STYLES)) {
    lines.push(
      `    classDef ${status} fill:${style.fill},stroke:${style.stroke},color:${style.color}`
    );
  }

  // Add extra emphasis for active node
  lines.push('    classDef activeHighlight stroke-width:3px');

  // Apply classes to nodes
  const statusGroups: Record<NodeStatus, string[]> = {
    pending: [],
    active: [],
    completed: [],
    failed: [],
  };

  for (const node of nodes) {
    statusGroups[node.status].push(node.id);
  }

  for (const [status, nodeIds] of Object.entries(statusGroups)) {
    if (nodeIds.length > 0) {
      lines.push(`    class ${nodeIds.join(',')} ${status}`);
    }
  }

  // Apply active highlight
  if (activeNode !== undefined && activeNode !== null && activeNode !== '') {
    lines.push(`    class ${activeNode} activeHighlight`);
  }

  return lines.join('\n');
}

/**
 * Wraps a Mermaid diagram in a markdown code fence.
 *
 * @param diagram - The Mermaid diagram code
 * @returns Markdown code fence with mermaid language
 */
export function wrapInCodeFence(diagram: string): string {
  return `\`\`\`mermaid\n${diagram}\n\`\`\``;
}

/**
 * Helper to create diagram nodes from a workflow node map.
 * Automatically determines status based on active/completed nodes.
 *
 * @param nodeNames - List of all node names in the workflow
 * @param activeNode - Currently executing node
 * @param completedNodes - Set of completed node names
 * @param failedNodes - Set of failed node names (optional)
 * @returns Array of diagram nodes with correct status
 */
export function createDiagramNodes(
  nodeNames: string[],
  activeNode: string,
  completedNodes: Set<string> | string[],
  failedNodes: Set<string> | string[] = []
): DiagramNode[] {
  const completedSet = completedNodes instanceof Set ? completedNodes : new Set(completedNodes);
  const failedSet = failedNodes instanceof Set ? failedNodes : new Set(failedNodes);

  return nodeNames.map((id) => {
    let status: NodeStatus;

    if (failedSet.has(id)) {
      status = 'failed';
    } else if (id === activeNode) {
      status = 'active';
    } else if (completedSet.has(id)) {
      status = 'completed';
    } else {
      status = 'pending';
    }

    return { id, status };
  });
}

/**
 * Helper to extract edges from workflow node definitions.
 *
 * @param nodes - Map of node name to node definition
 * @returns Array of edges for the diagram
 */
export function extractEdgesFromWorkflow<T extends { next?: string | ((state: unknown) => string) }>(
  nodes: Record<string, T>
): DiagramEdge[] {
  const edges: DiagramEdge[] = [];

  for (const [nodeName, nodeDef] of Object.entries(nodes)) {
    // Only extract static transitions for visualization
    if (typeof nodeDef.next === 'string') {
      edges.push({ from: nodeName, to: nodeDef.next });
    }
    // For dynamic transitions, we could add a label indicating it's conditional
    // But we skip them for now as they're state-dependent
  }

  return edges;
}
