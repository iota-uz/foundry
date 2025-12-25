/**
 * Workflow Edge Component
 *
 * Custom React Flow edge with:
 * - Animated flow during execution
 * - Delete button on hover
 * - Status-based coloring
 */

'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore, useWorkflowExecutionStore } from '@/store';

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const deleteEdge = useWorkflowBuilderStore((s) => s.deleteEdge);
  const currentNodeId = useWorkflowExecutionStore((s) => s.currentNodeId);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Check if this edge is currently active (source node is running)
  const isActive = id.includes(currentNodeId ?? '__none__');

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isActive ? '#fbbf24' : selected ? '#3b82f6' : '#6b7280',
          strokeWidth: isActive ? 3 : 2,
        }}
      />

      {/* Delete button on hover/selection */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteEdge(id);
              }}
              className="p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
              aria-label="Delete edge"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
