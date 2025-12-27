/**
 * Workflow Graph Viewer Component
 *
 * React Flow-based visualization of workflow structure.
 * Features:
 * - Workflow selector dropdown
 * - Node coloring by type
 * - Interactive zoom/pan
 * - MiniMap for navigation
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Select, Skeleton, EmptyState } from '@/components/shared';
import { WorkflowNode } from '@/components/workflow-builder/nodes/base-workflow-node';
import { ShareIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

// =============================================================================
// Node Types Registration
// =============================================================================

const nodeTypes = {
  workflow: WorkflowNode,
};

// =============================================================================
// Main Component
// =============================================================================

export function WorkflowGraphViewer() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Fetch workflows list
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        setLoading(true);
        const response = await fetch('/api/workflows');
        if (!response.ok) throw new Error('Failed to fetch workflows');

        const data = await response.json() as { workflows: Workflow[] };
        setWorkflows(data.workflows);

        // Auto-select first workflow if available
        if (data.workflows.length > 0 && data.workflows[0] !== undefined) {
          setSelectedWorkflowId(data.workflows[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void fetchWorkflows();
  }, []);

  // Update nodes/edges when workflow is selected
  useEffect(() => {
    const workflow = workflows.find((w) => w.id === selectedWorkflowId);
    if (!workflow) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Transform workflow nodes to React Flow nodes
    const flowNodes: Node[] = workflow.nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: node.position,
      data: node.data,
      draggable: true,
    }));

    // Transform workflow edges to React Flow edges
    const flowEdges: Edge[] = workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      animated: false,
      style: {
        stroke: '#3f3f46',
        strokeWidth: 2,
      },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [selectedWorkflowId, workflows]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Create workflow options for select
  const workflowOptions = useMemo(
    () =>
      workflows.map((w) => {
        const option: { value: string; label: string; description?: string } = {
          value: w.id,
          label: w.name,
        };
        if (w.description !== undefined && w.description !== null && w.description !== '') {
          option.description = w.description;
        }
        return option;
      }),
    [workflows]
  );

  if (error !== null && error !== '') {
    return (
      <div className="p-6">
        <div className="bg-accent-error/10 border border-accent-error/30 rounded-lg p-4">
          <p className="text-accent-error text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle bg-bg-primary">
        <div className="w-64">
          {loading ? (
            <Skeleton className="h-9 rounded-md" />
          ) : (
            <Select
              value={selectedWorkflowId}
              onChange={setSelectedWorkflowId}
              options={workflowOptions}
              placeholder="Select a workflow"
            />
          )}
        </div>

        {selectedWorkflowId && (
          <p className="text-xs text-text-tertiary">
            {nodes.length} nodes • {edges.length} edges
          </p>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-bg-primary">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-text-tertiary">Loading workflows...</p>
            </div>
          </div>
        ) : !selectedWorkflowId ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={<ShareIcon />}
              title="No workflow selected"
              description="Select a workflow from the dropdown to view its structure."
              size="md"
            />
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={<ShareIcon />}
              title="Empty workflow"
              description="This workflow has no nodes yet."
              size="md"
            />
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              color="#27272a"
              gap={20}
              size={1}
            />

            <Controls
              position="top-right"
              showZoom={true}
              showFitView={true}
              showInteractive={false}
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
