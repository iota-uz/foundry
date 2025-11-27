/**
 * Custom React Flow edge for relationships with cardinality labels
 */

'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import { formatCardinalityLabel } from '@/lib/visualization-helpers';

interface RelationshipEdgeProps extends EdgeProps {
  data?: {
    cardinality?: '1:1' | '1:N' | 'N:M';
    relationshipType?: 'FK' | 'REFERENCE';
    label?: string;
  };
}

export function RelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: RelationshipEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
    offset: 20,
  });

  const cardinalityLabel = formatCardinalityLabel(data?.cardinality);
  const strokeColor = selected ? '#3b82f6' : '#6b7280';
  const strokeWidth = selected ? 2.5 : 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...(markerEnd && { markerEnd })}
        style={{
          stroke: strokeColor,
          strokeWidth,
          transition: 'stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out',
        }}
        interactionWidth={20}
      />

      {/* Cardinality label */}
      {cardinalityLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'rgba(15, 15, 15, 0.95)',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid #333333',
              color: '#ffffff',
              pointerEvents: 'none',
              userSelect: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            {cardinalityLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

RelationshipEdgeComponent.displayName = 'RelationshipEdge';
