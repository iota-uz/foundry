/**
 * Custom React Flow node for API endpoints
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getMethodColor, getMethodBgColor } from '@/lib/visualization-helpers';

interface EndpointNodeProps {
  data: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    operationId?: string;
    summary?: string;
    module?: string;
  };
  isSelected?: boolean;
}

export const EndpointNodeComponent = memo(
  function EndpointNodeComponent({ data, isSelected }: EndpointNodeProps) {
    const methodColor = getMethodColor(data.method);

    return (
      <div
        className={`
          bg-bg-secondary border rounded-lg overflow-hidden
          transition-all duration-200
          ${isSelected ? 'border-accent-primary shadow-lg shadow-accent-primary/20' : 'border-border-default'}
        `}
        style={{ minWidth: '240px' }}
      >
        {/* Source handle for connecting to response types */}
        <Handle
          type="source"
          position={Position.Right}
          id="response"
          style={{ background: methodColor }}
          className="!w-3 !h-3"
        />

        {/* Target handle for connecting from request types */}
        <Handle
          type="target"
          position={Position.Left}
          id="request"
          style={{ background: methodColor }}
          className="!w-3 !h-3"
        />

        {/* Method badge */}
        <div
          className={`
            px-4 py-3
            ${getMethodBgColor(data.method)}
            border-b border-border-default
            flex items-center gap-2
          `}
        >
          <span
            className="
              text-xs font-bold text-white
              px-2 py-1 rounded
              uppercase tracking-wider
            "
            style={{ backgroundColor: methodColor }}
          >
            {data.method}
          </span>
          <span className="text-xs text-text-primary font-medium truncate">
            {data.operationId && `#${data.operationId}`}
          </span>
        </div>

        {/* Path */}
        <div className="px-4 py-2 border-b border-border-default bg-bg-tertiary/50">
          <div className="text-xs font-mono text-accent-primary truncate">
            {data.path}
          </div>
        </div>

        {/* Summary */}
        {data.summary && (
          <div className="px-4 py-2 text-xs text-text-secondary line-clamp-2">
            {data.summary}
          </div>
        )}

        {/* Content helper */}
        {!data.summary && (
          <div className="px-4 py-2 text-xs text-text-tertiary italic">
            {data.method} endpoint
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

EndpointNodeComponent.displayName = 'EndpointNode';
