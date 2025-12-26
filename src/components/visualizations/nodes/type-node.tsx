/**
 * Custom React Flow node for GraphQL types
 */

'use client';

import React, { memo, useState, useCallback, useLayoutEffect } from 'react';
import {
  Handle,
  Position,
  useUpdateNodeInternals,
} from '@xyflow/react';
import { getTypeKindColor } from '@/lib/visualization-helpers';

interface TypeNodeProps {
  id: string;
  data: {
    typeName: string;
    kind: 'OBJECT' | 'SCALAR' | 'ENUM' | 'INTERFACE' | 'UNION' | 'INPUT_OBJECT';
    fields?: Array<{
      name: string;
      type: string;
    }>;
    description?: string;
  };
  isSelected?: boolean;
}

export const GraphQLTypeNodeComponent = memo(
  function GraphQLTypeNodeComponent({ id, data, isSelected }: TypeNodeProps) {
    const [expanded, setExpanded] = useState(false);
    const updateNodeInternals = useUpdateNodeInternals();
    const kindColor = getTypeKindColor(data.kind);

    useLayoutEffect(() => {
      updateNodeInternals(id);
    }, [expanded, id, updateNodeInternals]);

    const handleToggle = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    const hasFields = data.fields !== undefined && data.fields !== null && data.fields.length > 0;
    const isExpandable =
      hasFields && ['OBJECT', 'INPUT_OBJECT', 'INTERFACE'].includes(data.kind);

    return (
      <div
        className={`
          bg-bg-secondary border rounded-lg overflow-hidden
          transition-all duration-200
          ${isSelected === true ? 'border-accent-primary shadow-lg shadow-accent-primary/20' : 'border-border-default'}
          ${expanded === true ? 'shadow-lg' : ''}
        `}
        style={{ minWidth: '200px' }}
      >
        {/* Reference handles */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ background: kindColor }}
          className="!w-3 !h-3"
        />

        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ background: kindColor }}
          className="!w-3 !h-3"
        />

        {/* Type header */}
        <div
          className={`
            px-4 py-3
            border-b border-border-default
            ${isExpandable === true ? 'cursor-pointer hover:bg-bg-tertiary transition-colors' : ''}
          `}
          onClick={isExpandable === true ? handleToggle : undefined}
        >
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Kind badge */}
              <span
                className="
                  text-xs font-bold text-white
                  px-2 py-1 rounded
                  uppercase tracking-wider flex-shrink-0
                "
                style={{ backgroundColor: kindColor }}
              >
                {data.kind.replace(/_/g, ' ').slice(0, 3)}
              </span>
              <span className="text-sm font-semibold text-text-primary truncate">
                {data.typeName}
              </span>
            </div>
            {isExpandable === true && (
              <span className="text-text-secondary flex-shrink-0">
                {expanded === true ? '▼' : '▶'}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description !== undefined && data.description !== null && data.description !== '' && (
          <div className="px-4 py-2 border-b border-border-default bg-bg-tertiary/50">
            <p className="text-xs text-text-secondary line-clamp-2">
              {data.description}
            </p>
          </div>
        )}

        {/* Fields */}
        {isExpandable === true && expanded === true && hasFields === true && (
          <div className="divide-y divide-border-default max-h-64 overflow-y-auto">
            {data.fields!.map((field, index) => (
              <div
                key={`${field.name}-${index}`}
                className="
                  px-4 py-2.5
                  hover:bg-bg-tertiary
                  transition-colors
                  text-xs
                "
              >
                <div className="text-text-primary font-medium">{field.name}</div>
                <div className="text-text-secondary font-mono text-xs mt-1">
                  {field.type}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scalar/Enum info */}
        {isExpandable !== true && (
          <div className="px-4 py-2 text-xs text-text-secondary bg-bg-tertiary/50 text-center">
            {data.kind}
          </div>
        )}

        {/* Field count for expandable types */}
        {isExpandable === true && expanded !== true && hasFields === true && (
          <div className="px-4 py-2 text-xs text-text-secondary bg-bg-tertiary/50 text-center">
            {data.fields!.length} field{data.fields!.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.id === next.id &&
      prev.isSelected === next.isSelected &&
      prev.data === next.data
    );
  }
);

GraphQLTypeNodeComponent.displayName = 'GraphQLTypeNode';
