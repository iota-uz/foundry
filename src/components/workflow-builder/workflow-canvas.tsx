/**
 * Workflow Canvas
 *
 * Production-grade React Flow canvas with Railway-inspired styling.
 * Features:
 * - Centralized node colors for MiniMap
 * - Minimal empty state without backdrop blur
 * - Clean grid background
 * - Right-click context menu
 * - Styled controls
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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
import { CanvasContextMenu } from './canvas-context-menu';

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
// Context Menu State Type
// ============================================================================

interface ContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

// ============================================================================
// Component
// ============================================================================

export function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const { nodes, edges, setNodes, setEdges, addNode, selectNode } =
    useWorkflowBuilderStore();

  // Handle node changes (position, selection, etc.)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(
        changes,
        nodes
      ) as Node<WorkflowNodeData>[];
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
          addEdge({ ...connection, type: 'workflowEdge' }, edges)
        );
      }
    },
    [edges, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
      setContextMenu(null);
    },
    [selectNode]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    setContextMenu(null);
  }, [selectNode]);

  // Handle context menu (right-click)
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPosition.x,
        flowY: flowPosition.y,
      });
    },
    [screenToFlowPosition]
  );

  // Handle drag over (for drag-drop from library)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop (create new node)
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const typeData = event.dataTransfer.getData('application/reactflow');
      if (!typeData) return;
      const type = typeData as NodeType;

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

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative overflow-hidden">
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
        onContextMenu={onContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: 'workflowEdge',
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-bg-primary"
      >
        {/* Grid background */}
        <Background
          color="var(--color-border-subtle)"
          gap={16}
          size={1}
        />

        {/* Controls */}
        <Controls
          className="!bg-bg-secondary !border-border-default !rounded-lg !shadow-lg"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Empty state - minimal design */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-xs">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-bg-tertiary border border-border-subtle flex items-center justify-center">
              <svg
                className="w-6 h-6 text-text-tertiary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              Start building your workflow
            </p>
            <p className="text-xs text-text-tertiary">
              Drag nodes from the library or right-click to add
            </p>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu !== null && (
        <CanvasContextMenu
          position={contextMenu}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
