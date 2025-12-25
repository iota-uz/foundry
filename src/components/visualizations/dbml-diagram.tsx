/**
 * DBML Schema visualization using React Flow
 */

'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DatabaseTableNode } from './nodes/table-node';
import { RelationshipEdgeComponent } from './edges/relationship-edge';
import { getLayoutedElements, parseDBML, generateNodeId, generateEdgeId } from '@/lib/visualization-helpers';
import { CustomNode, CustomEdge } from '@/types/visualization';

interface DBMLDiagramProps {
  dbml: string;
  loading?: boolean;
  error?: string | undefined;
}

export function DBMLDiagram({ dbml, loading, error }: DBMLDiagramProps) {
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  // Parse DBML and create React Flow nodes/edges
  useEffect(() => {
    if (!dbml || loading) return;

    async function calculateLayout() {
      try {
        const parsed = parseDBML(dbml);

        // Create table nodes
        const tableNodes: CustomNode[] = parsed.tables.map((table) => ({
          id: generateNodeId('table', table.name),
          type: 'table' as const,
          position: { x: 0, y: 0 },
          data: {
            tableName: table.name,
            fields: table.fields || [],
            expanded: false,
          },
          width: 220,
          height: 100,
        })) as CustomNode[];

        // Create relationship edges
        const relationshipEdges: CustomEdge[] = parsed.relationships.map((rel) => ({
          id: generateEdgeId(rel.source, rel.target),
          source: generateNodeId('table', rel.source),
          target: generateNodeId('table', rel.target),
          type: 'relationship' as const,
          data: {
            cardinality: rel.cardinality,
            relationshipType: 'FK',
          },
        })) as CustomEdge[];

        // Calculate layout
        const layouted = await getLayoutedElements(tableNodes, relationshipEdges, layoutDirection);

        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      } catch (err) {
        console.error('Failed to parse DBML:', err);
      }
    }

    calculateLayout();
  }, [dbml, loading, layoutDirection]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as CustomNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds) as CustomEdge[]);
  }, []);

  const nodeTypes = useMemo(
    () => ({
      table: DatabaseTableNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      relationship: RelationshipEdgeComponent,
    }),
    []
  );

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <p className="text-accent-error text-sm mb-2">Failed to load schema</p>
          <p className="text-text-secondary text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!dbml) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <p className="text-text-secondary">No schema data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-bg-primary">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        onlyRenderVisibleElements={true}
      >
        <Background color="#1a1a1a" gap={16} size={1} />

        <Controls position="top-right">
          <button
            onClick={() => setLayoutDirection('TB')}
            className="
              p-2 text-text-primary hover:text-accent-primary
              transition-colors cursor-pointer
              border-b border-border-default
            "
            title="Vertical layout"
          >
            ⬇️
          </button>
          <button
            onClick={() => setLayoutDirection('LR')}
            className="
              p-2 text-text-primary hover:text-accent-primary
              transition-colors cursor-pointer
            "
            title="Horizontal layout"
          >
            ➡️
          </button>
        </Controls>

        <MiniMap
          nodeColor={() => '#3b82f6'}
          nodeStrokeColor="#1e40af"
          nodeStrokeWidth={2}
          nodeBorderRadius={4}
          position="bottom-right"
          pannable
          zoomable
          className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}
