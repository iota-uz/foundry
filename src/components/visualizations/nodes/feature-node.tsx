/**
 * Custom React Flow node for feature dependencies
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getStatusColor } from '@/lib/visualization-helpers';

interface FeatureNodeProps {
  data: {
    featureName: string;
    featureId: string;
    module?: string;
    status?: 'pending' | 'in_progress' | 'completed';
    description?: string;
  };
  isSelected?: boolean;
}

export const FeatureNodeComponent = memo(
  function FeatureNodeComponent({ data, isSelected }: FeatureNodeProps) {
    const statusColor = getStatusColor(data.status);
    const isDependency = data.status !== 'completed';

    return (
      <div
        className={`
          bg-bg-secondary border rounded-lg overflow-hidden
          transition-all duration-200
          ${isSelected ? 'border-accent-primary shadow-lg shadow-accent-primary/20' : 'border-border-default'}
          hover:border-accent-primary/50
        `}
        style={{ minWidth: '200px' }}
      >
        {/* Connection handles */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ background: statusColor }}
          className="!w-3 !h-3"
        />

        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ background: statusColor }}
          className="!w-3 !h-3"
        />

        {/* Status indicator bar */}
        <div
          className="h-1 w-full"
          style={{ backgroundColor: statusColor }}
        />

        {/* Feature header */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-2 mb-2">
            {/* Status badge */}
            <span
              className="
                text-xs font-semibold text-white
                px-2 py-1 rounded
                flex-shrink-0
                uppercase tracking-wider
              "
              style={{ backgroundColor: statusColor }}
            >
              {(data.status || 'pending').replace(/_/g, ' ')}
            </span>
          </div>

          {/* Feature name */}
          <h4 className="text-sm font-semibold text-text-primary mb-1 line-clamp-2">
            {data.featureName}
          </h4>

          {/* Module */}
          {data.module && (
            <div className="text-xs text-text-secondary mb-2">
              {data.module}
            </div>
          )}

          {/* Description */}
          {data.description && (
            <p className="text-xs text-text-secondary line-clamp-2">
              {data.description}
            </p>
          )}
        </div>

        {/* Warning for incomplete features */}
        {isDependency && (
          <div className="px-4 py-2 bg-accent-warning/10 border-t border-accent-warning/20 text-xs text-accent-warning">
            ⚠ Blocking dependency
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isSelected === next.isSelected &&
      prev.data === next.data
    );
  }
);

FeatureNodeComponent.displayName = 'FeatureNode';
