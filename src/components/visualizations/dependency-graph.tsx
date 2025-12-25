/**
 * Feature dependency graph visualization using React Flow
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

import { FeatureNodeComponent } from './nodes/feature-node';
import { RelationshipEdgeComponent } from './edges/relationship-edge';
import {
  getLayoutedElements,
  generateNodeId,
  generateEdgeId,
  detectCircularDependencies,
} from '@/lib/visualization-helpers';
import { CustomNode, CustomEdge } from '@/types/visualization';

interface Feature {
  id: string;
  name: string;
  module?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  description?: string;
  dependencies?: string[];
}

interface DependencyGraphProps {
  features: Feature[];
  loading?: boolean;
  error?: string | undefined;
}

export function DependencyGraph({
  features,
  loading,
  error,
}: DependencyGraphProps) {
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [circularDeps, setCircularDeps] = useState<string[][]>([]);

  // Create nodes and edges from features
  useEffect(() => {
    if (!features || loading) return;

    async function calculateLayout() {
      try {
        // Create feature nodes
        const featureNodes: CustomNode[] = features.map((feature) => ({
          id: generateNodeId('feature', feature.id),
          type: 'feature' as const,
          position: { x: 0, y: 0 },
          data: {
            featureName: feature.name,
            featureId: feature.id,
            module: feature.module,
            status: feature.status,
            description: feature.description,
          },
          width: 200,
          height: 100,
        })) as CustomNode[];

        // Create dependency edges
        const depEdges: CustomEdge[] = [];
        const edgeSet = new Set<string>();

        features.forEach((feature) => {
          if (feature.dependencies && feature.dependencies.length > 0) {
            feature.dependencies.forEach((depId) => {
              const depFeature = features.find((f) => f.id === depId);
              if (depFeature) {
                const edgeId = generateEdgeId(
                  generateNodeId('feature', feature.id),
                  generateNodeId('feature', depId)
                );
                if (!edgeSet.has(edgeId)) {
                  depEdges.push({
                    id: edgeId,
                    source: generateNodeId('feature', feature.id),
                    target: generateNodeId('feature', depId),
                    type: 'relationship',
                    data: {
                      cardinality: '1:1',
                      relationshipType: 'REFERENCE',
                    },
                  });
                  edgeSet.add(edgeId);
                }
              }
            });
          }
        });

        // Detect circular dependencies
        const circular = detectCircularDependencies(
          depEdges.map((e) => ({
            source: e.source as string,
            target: e.target as string,
          }))
        );
        setCircularDeps(circular);

        // Highlight circular dependency edges in red
        const circularEdgeIds = new Set<string>();
        circular.forEach((cycle) => {
          for (let i = 0; i < cycle.length - 1; i++) {
            const current = cycle[i];
            const next = cycle[i + 1];
            if (current && next) {
              circularEdgeIds.add(generateEdgeId(current, next));
            }
          }
        });

        const highlightedEdges: CustomEdge[] = depEdges.map((edge) => ({
          ...edge,
          style: circularEdgeIds.has(edge.id)
            ? {
                stroke: '#ef4444',
                strokeWidth: 2.5,
              }
            : undefined,
        } as CustomEdge));

        // Calculate layout
        const layouted = await getLayoutedElements(
          featureNodes,
          highlightedEdges,
          layoutDirection
        );

        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      } catch (err) {
        console.error('Failed to create dependency graph:', err);
      }
    }

    calculateLayout();
  }, [features, loading, layoutDirection]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as CustomNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds) as CustomEdge[]);
  }, []);

  const nodeTypes = useMemo(
    () => ({
      feature: FeatureNodeComponent,
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
          <p className="text-accent-error text-sm mb-2">Failed to load features</p>
          <p className="text-text-secondary text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!features || features.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <p className="text-text-secondary">No features available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-bg-primary flex flex-col">
      {/* Circular dependency warning */}
      {circularDeps.length > 0 && (
        <div className="bg-accent-error/10 border-b border-accent-error/20 px-4 py-3">
          <p className="text-accent-error text-sm font-medium">
            ⚠️ {circularDeps.length} circular dependenc{circularDeps.length !== 1 ? 'ies' : 'y'} detected
          </p>
          <p className="text-accent-error/80 text-xs mt-1">
            Red edges indicate features that depend on each other directly or indirectly.
          </p>
        </div>
      )}

      <div className="flex-1">
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
            nodeColor={(node) => {
              const data = node.data as Record<string, unknown>;
              const status = data.status;
              if (status === 'completed') return '#10b981';
              if (status === 'in_progress') return '#f59e0b';
              return '#6b7280';
            }}
            nodeStrokeColor="#3b82f6"
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            position="bottom-right"
            pannable
            zoomable
            className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
