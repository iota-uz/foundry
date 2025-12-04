/**
 * Utility functions for visualization components
 */

import { Position } from '@xyflow/react';
import { CustomNode, CustomEdge } from '@/types/visualization';

// Lazy load dagre and graphlib to avoid webpack bundling issues
let dagre: any = null;
let graphlib: any = null;

async function loadLayoutLibraries() {
  if (!dagre || !graphlib) {
    const [dagreModule, graphlibModule] = await Promise.all([
      import('@dagrejs/dagre'),
      import('@dagrejs/graphlib'),
    ]);
    dagre = dagreModule.default || dagreModule;
    graphlib = graphlibModule.graphlib || graphlibModule;
  }
  return { dagre, graphlib };
}

/**
 * Get layout parameters for specified direction
 */
export function getLayoutConfig(direction: 'TB' | 'LR' = 'TB') {
  return {
    rankdir: direction,
    ranksep: 75,
    nodesep: 50,
    edgesep: 10,
  };
}

/**
 * Calculate layout positions using dagre for React Flow nodes
 */
export async function getLayoutedElements(
  nodes: CustomNode[],
  edges: CustomEdge[],
  direction: 'TB' | 'LR' = 'TB'
): Promise<{ nodes: CustomNode[]; edges: CustomEdge[] }> {
  try {
    const { dagre, graphlib } = await loadLayoutLibraries();

    const dagreGraph = new graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Configure layout
    const config = getLayoutConfig(direction);
    dagreGraph.setGraph(config);

    // Add nodes with dimensions
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: node.width || 200,
        height: node.height || 100,
      });
    });

    // Add edges
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Map positions back to React Flow nodes
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);

      return {
        ...node,
        targetPosition: direction === 'TB' ? Position.Top : Position.Left,
        sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
        position: {
          x: nodeWithPosition.x - (node.width || 200) / 2,
          y: nodeWithPosition.y - (node.height || 100) / 2,
        },
      } as CustomNode;
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error('Layout error:', error);
    // Return nodes without layout if dagre fails
    return { nodes, edges };
  }
}

/**
 * Parse DBML string and extract tables/relationships
 * Simple parser - assumes well-formed DBML
 */
export function parseDBML(dbml: string) {
  const tables: Array<{
    name: string;
    fields: Array<{
      id: string;
      name: string;
      type: string;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      isRequired: boolean;
    }>;
  }> = [];

  const relationships: Array<{
    source: string;
    target: string;
    cardinality: '1:1' | '1:N' | 'N:M';
  }> = [];

  // Very basic DBML parsing - extract table blocks
  const tableRegex = /Table\s+"?(\w+)"?\s*\{([^}]*)\}/gi;
  let tableMatch: RegExpExecArray | null;

  while ((tableMatch = tableRegex.exec(dbml)) !== null) {
    const tableName = tableMatch[1] || '';
    const tableContent = tableMatch[2] || '';

    const fields: Array<{
      id: string;
      name: string;
      type: string;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      isRequired: boolean;
    }> = [];
    const fieldRegex = /(\w+)\s+(\w+(?:\(\d+\))?)\s*(.*?)(?:\n|$)/gm;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(tableContent)) !== null) {
      const fieldName = fieldMatch[1] || '';
      const fieldType = fieldMatch[2] || '';
      const fieldAttrs = fieldMatch[3] || '';

      fields.push({
        id: `${tableName}.${fieldName}`,
        name: fieldName,
        type: fieldType,
        isPrimaryKey: fieldAttrs.includes('[pk]'),
        isForeignKey: fieldAttrs.includes('[ref:'),
        isRequired: fieldAttrs.includes('not null'),
      });
    }

    tables.push({ name: tableName, fields });
  }

  // Parse relationships
  const relRegex = /Ref:\s*(\w+)\.(\w+)\s*(<|>)\s*(\w+)\.(\w+)/gi;
  let relMatch;

  while ((relMatch = relRegex.exec(dbml)) !== null) {
    const sourceTable = relMatch[1] ?? 'Unknown';
    const targetTable = relMatch[4] ?? 'Unknown';

    relationships.push({
      source: sourceTable,
      target: targetTable,
      cardinality: '1:N',
    });
  }

  return { tables, relationships };
}

/**
 * Color for endpoint method
 */
export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '#3b82f6', // blue
    POST: '#10b981', // green
    PUT: '#f59e0b', // amber
    DELETE: '#ef4444', // red
    PATCH: '#8b5cf6', // purple
  };
  return colors[method] || '#6b7280'; // gray default
}

/**
 * Get background color for method
 */
export function getMethodBgColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/20',
    POST: 'bg-green-500/20',
    PUT: 'bg-amber-500/20',
    DELETE: 'bg-red-500/20',
    PATCH: 'bg-purple-500/20',
  };
  return colors[method] || 'bg-gray-500/20';
}

/**
 * Get badge color for GraphQL type kind
 */
export function getTypeKindColor(kind: string): string {
  const colors: Record<string, string> = {
    OBJECT: '#3b82f6', // blue
    SCALAR: '#8b5cf6', // purple
    ENUM: '#ec4899', // pink
    INTERFACE: '#06b6d4', // cyan
    UNION: '#f59e0b', // amber
    INPUT_OBJECT: '#10b981', // green
  };
  return colors[kind] || '#6b7280'; // gray
}

/**
 * Get status color for feature
 */
export function getStatusColor(status?: string): string {
  const colors: Record<string, string> = {
    pending: '#6b7280', // gray
    in_progress: '#f59e0b', // amber
    completed: '#10b981', // green
  };
  return colors[status || 'pending'] || '#6b7280';
}

/**
 * Generate node ID from different sources
 */
export function generateNodeId(type: string, identifier: string): string {
  return `${type}-${identifier.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

/**
 * Generate edge ID
 */
export function generateEdgeId(source: string, target: string): string {
  return `edge-${source}-${target}`;
}

/**
 * Detect circular dependencies in feature graph
 */
export function detectCircularDependencies(
  edges: Array<{ source: string; target: string }>
): string[][] {
  const adjacencyList: Record<string, string[]> = {};
  const visited = new Set<string>();
  const circularDeps: string[][] = [];

  // Build adjacency list
  edges.forEach(({ source, target }) => {
    if (!adjacencyList[source]) {
      adjacencyList[source] = [];
    }
    adjacencyList[source].push(target);
  });

  // DFS to find cycles
  function dfs(node: string, path: Set<string>): void {
    if (path.has(node)) {
      const cycleStart = Array.from(path).indexOf(node);
      if (cycleStart >= 0) {
        circularDeps.push(Array.from(path).slice(cycleStart).concat(node));
      }
      return;
    }

    if (visited.has(node)) {
      return;
    }

    path.add(node);

    if (adjacencyList[node]) {
      adjacencyList[node].forEach((neighbor) => {
        dfs(neighbor, new Set(path));
      });
    }

    path.delete(node);
    visited.add(node);
  }

  // Check all nodes
  Object.keys(adjacencyList).forEach((node) => {
    if (!visited.has(node)) {
      dfs(node, new Set());
    }
  });

  return circularDeps;
}

/**
 * Format edge label with cardinality
 */
export function formatCardinalityLabel(cardinality?: string): string {
  const labels: Record<string, string> = {
    '1:1': '1:1',
    '1:N': '1:N',
    'N:M': 'N:M',
  };
  return labels[cardinality || '1:N'] || '1:N';
}
