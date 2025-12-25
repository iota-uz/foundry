/**
 * Workflow Canvas
 *
 * Main React Flow canvas for the workflow builder.
 * Handles node drag-and-drop, connections, and interaction.
 */

'use client';

import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useReactFlow,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowBuilderStore } from '@/store';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';
import { NodeType } from '@/lib/graph/enums';
import { WorkflowNode } from './nodes/base-workflow-node';
import { WorkflowEdge } from './edges/workflow-edge';

// ============================================================================
// Custom Node/Edge Types
// ============================================================================

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
} as NodeTypes;

const edgeTypes: EdgeTypes = {
  workflowEdge: WorkflowEdge,
};

// ============================================================================
// Component
// ============================================================================

export function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    selectNode,
  } = useWorkflowBuilderStore();

  // Handle node changes (position, selection, etc.)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(changes, nodes) as Node<WorkflowNodeData>[];
      setNodes(updatedNodes);
    },
    [nodes, setNodes]
  );

  // Handle edge changes
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges]
  );

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (connection.source && connection.target) {
        setEdges(
          addEdge(
            { ...connection, type: 'workflowEdge' },
            edges
          )
        );
      }
    },
    [edges, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Handle drag over (for drag-drop from library)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop (create new node)
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      // Get position in flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Add new node
      const nodeId = addNode(type, position);

      // Select the new node
      selectNode(nodeId);
    },
    [screenToFlowPosition, addNode, selectNode]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'workflowEdge',
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-bg-primary"
      >
        <Background color="#333" gap={15} />
        <Controls className="!bg-bg-secondary !border-border-default" />
        <MiniMap
          className="!bg-bg-secondary !border-border-default"
          nodeColor={(node) => {
            const nodeType = node.data?.nodeType as NodeType | undefined;
            switch (nodeType) {
              case NodeType.Agent:
                return '#a855f7';
              case NodeType.Command:
                return '#22c55e';
              case NodeType.SlashCommand:
                return '#eab308';
              case NodeType.Eval:
                return '#3b82f6';
              case NodeType.Http:
                return '#06b6d4';
              case NodeType.Llm:
                return '#ec4899';
              default:
                return '#6b7280';
            }
          }}
        />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-8 rounded-lg bg-bg-secondary/80 backdrop-blur">
            <p className="text-lg text-text-secondary mb-2">
              Drag nodes from the library to get started
            </p>
            <p className="text-sm text-text-tertiary">
              Connect nodes to define your workflow execution order
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
