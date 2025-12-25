/**
 * Workflow Edge Component
 *
 * Production-grade React Flow edge with Linear/Vercel-inspired styling.
 * Features:
 * - Smooth transition on stroke color changes
 * - Ghost-style delete button on selection
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

// ============================================================================
// Component
// ============================================================================

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

  // Check if this edge is currently active
  const isActive = id.includes(currentNodeId ?? '__none__');

  // Determine stroke color
  const strokeColor = isActive
    ? 'var(--color-accent-warning)'
    : selected
      ? 'var(--color-accent-primary)'
      : 'var(--color-border-default)';

  return (
    <>
      {/* Edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: isActive ? 2.5 : selected ? 2 : 1.5,
          transition: 'stroke 200ms ease-out, stroke-width 200ms ease-out',
        }}
      />

      {/* Animated flow indicator for active edges */}
      {isActive && (
        <BaseEdge
          id={`${id}-animated`}
          path={edgePath}
          style={{
            stroke: 'var(--color-accent-warning)',
            strokeWidth: 2.5,
            strokeDasharray: '5 5',
            animation: 'flow 0.5s linear infinite',
          }}
        />
      )}

      {/* Delete button on selection */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteEdge(id);
              }}
              className={`
                flex items-center justify-center
                w-6 h-6 rounded-full
                bg-bg-elevated border border-border-default
                text-text-tertiary hover:text-accent-error
                hover:border-accent-error/50 hover:bg-accent-error/10
                shadow-lg
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-error
              `}
              aria-label="Delete edge"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
