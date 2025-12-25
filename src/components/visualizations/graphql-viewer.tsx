/**
 * GraphQL schema visualization using React Flow
 */

'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
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

import { GraphQLTypeNodeComponent } from './nodes/type-node';
import { RelationshipEdgeComponent } from './edges/relationship-edge';
import {
  getLayoutedElements,
  generateNodeId,
  generateEdgeId,
} from '@/lib/visualization-helpers';
import { CustomNode, CustomEdge } from '@/types/visualization';
import { buildSchema, GraphQLObjectType, GraphQLInputObjectType } from 'graphql';

interface GraphQLViewerProps {
  schema: string;
  loading?: boolean;
  error?: string | undefined;
}

export function GraphQLViewer({
  schema,
  loading,
  error,
}: GraphQLViewerProps) {
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  // Parse GraphQL schema and create React Flow nodes/edges
  useEffect(() => {
    if (!schema || loading) return;

    async function calculateLayout() {
      try {
        // Build GraphQL schema
        const graphQLSchema = buildSchema(schema);

        // Extract types
        const typeMap = graphQLSchema.getTypeMap();
        const types = Object.values(typeMap).filter(
          (type) =>
            !type.name.startsWith('__') &&
            !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(type.name)
        );

        // Create type nodes
        const typeNodes: CustomNode[] = types.map((type) => {
          let fields: Array<{ name: string; type: string }> = [];
          let kind = 'SCALAR' as 'SCALAR' | 'OBJECT' | 'ENUM' | 'INTERFACE' | 'UNION' | 'INPUT_OBJECT';

          if ('getFields' in type) {
            const typeObj = type as GraphQLObjectType | GraphQLInputObjectType;
            fields = Object.entries(typeObj.getFields()).map(([name, field]) => ({
              name,
              type: field.type.toString(),
            }));
            kind = 'OBJECT';
          } else if ('_values' in type) {
            kind = 'ENUM';
          } else if ('_typeConfig' in type) {
            kind = 'INTERFACE';
          }

          return {
            id: generateNodeId('type', type.name),
            type: 'graphqlType' as const,
            position: { x: 0, y: 0 },
            data: {
              typeName: type.name,
              kind,
              fields,
              description:
                'description' in type ? type.description : undefined,
            },
            width: 200,
            height: 100,
          } as CustomNode;
        });

        // Create edges based on field references
        const edges: CustomEdge[] = [];
        const edgeSet = new Set<string>();

        typeNodes.forEach((node) => {
          const typeData = node.data as Record<string, unknown>;
          if (typeData.fields && Array.isArray(typeData.fields)) {
            (typeData.fields as Array<{ name: string; type: string }>).forEach((field) => {
              // Extract referenced type from field type string
              const refType = field.type
                .replace(/[\[\]!]/g, '')
                .trim();
              const refNode = typeNodes.find(
                (n) => (n.data as Record<string, unknown>).typeName === refType
              );

              if (refNode && refNode.id !== node.id) {
                const edgeId = generateEdgeId(node.id, refNode.id);
                if (!edgeSet.has(edgeId)) {
                  edges.push({
                    id: edgeId,
                    source: node.id,
                    target: refNode.id,
                    type: 'relationship' as const,
                    data: {
                      cardinality: '1:1',
                      label: field.name,
                    },
                  } as CustomEdge);
                  edgeSet.add(edgeId);
                }
              }
            });
          }
        });

        // Calculate layout
        const layouted = await getLayoutedElements(typeNodes, edges, layoutDirection);

        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      } catch (err) {
        console.error('Failed to parse GraphQL schema:', err);
      }
    }

    calculateLayout();
  }, [schema, loading, layoutDirection]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as CustomNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds) as CustomEdge[]);
  }, []);

  const nodeTypes = useMemo(
    () => ({
      graphqlType: GraphQLTypeNodeComponent,
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

  if (!schema) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <p className="text-text-secondary">No GraphQL schema available</p>
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
          nodeColor={() => '#8b5cf6'}
          nodeStrokeColor="#6d28d9"
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
