/**
 * Custom React Flow node for database tables
 */

'use client';

import React, { memo, useState, useCallback, useLayoutEffect } from 'react';
import {
  Handle,
  Position,
  useUpdateNodeInternals,
} from '@xyflow/react';
import { KeyIcon, LinkIcon } from '@heroicons/react/24/outline';

interface DatabaseField {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isRequired: boolean;
}

interface TableNodeProps {
  id: string;
  data: {
    tableName: string;
    fields: DatabaseField[];
    module?: string;
    description?: string;
    expanded?: boolean;
  };
  isSelected?: boolean;
}

export const DatabaseTableNode = memo(
  function DatabaseTableNode({ id, data, isSelected }: TableNodeProps) {
    const [expanded, setExpanded] = useState(false);
    const updateNodeInternals = useUpdateNodeInternals();

    // CRITICAL: Update handle positions after expansion
    // Must use useLayoutEffect to ensure DOM has settled
    useLayoutEffect(() => {
      updateNodeInternals(id);
    }, [expanded, id, updateNodeInternals]);

    const handleToggle = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    const primaryKey = data.fields.find((f) => f.isPrimaryKey);
    const foreignKeys = data.fields.filter((f) => f.isForeignKey);

    return (
      <div
        className={`
          bg-bg-secondary border rounded-lg overflow-hidden
          transition-all duration-200
          ${isSelected === true ? 'border-accent-primary shadow-lg shadow-accent-primary/20' : 'border-border-default'}
          ${expanded === true ? 'shadow-lg' : ''}
        `}
        style={{ minWidth: '220px' }}
      >
        {/* Primary Key Handle - Right side */}
        {primaryKey && expanded && (
          <Handle
            type="source"
            position={Position.Right}
            id="pk"
            style={{
              top: '45px',
              background: '#10b981',
            }}
            className="!w-3 !h-3"
          />
        )}

        {/* Foreign Key Handles - Left side */}
        {expanded &&
          foreignKeys.map((field, index) => (
            <Handle
              key={field.id}
              type="target"
              position={Position.Left}
              id={field.id}
              style={{
                top: `${45 + (index + 1) * 28}px`,
                background: '#3b82f6',
              }}
              className="!w-3 !h-3"
            />
          ))}

        {/* Table Header */}
        <button
          onClick={handleToggle}
          className="
            w-full px-4 py-3
            bg-bg-tertiary text-left
            border-b border-border-default
            hover:bg-bg-secondary
            transition-colors
            flex items-center justify-between
            group
          "
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate">
              {data.tableName}
            </span>
            {data.fields.length > 0 && (
              <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">
                {data.fields.length}
              </span>
            )}
          </div>
          <span className="text-text-secondary group-hover:text-text-primary transition-colors flex-shrink-0">
            {expanded ? '▼' : '▶'}
          </span>
        </button>

        {/* Fields List */}
        {expanded && (
          <div className="divide-y divide-border-default max-h-96 overflow-y-auto">
            {data.fields.length === 0 ? (
              <div className="px-4 py-3 text-xs text-text-tertiary italic">
                No fields
              </div>
            ) : (
              data.fields.map((field) => (
                <div
                  key={field.id}
                  className="
                    px-4 py-2.5
                    hover:bg-bg-tertiary
                    transition-colors
                    text-xs
                    flex items-center gap-2
                  "
                >
                  {/* Field icons */}
                  <div className="flex items-center gap-1 flex-shrink-0 w-5">
                    {field.isPrimaryKey && (
                      <KeyIcon
                        title="Primary Key"
                        className="w-3.5 h-3.5 text-accent-success"
                      />
                    )}
                    {field.isForeignKey && (
                      <LinkIcon
                        title="Foreign Key"
                        className="w-3.5 h-3.5 text-accent-primary"
                      />
                    )}
                    {!field.isPrimaryKey && !field.isForeignKey && field.isRequired && (
                      <span
                        title="Required"
                        className="text-accent-warning text-xs"
                      >
                        *
                      </span>
                    )}
                  </div>

                  {/* Field name and type */}
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary font-medium truncate">
                      {field.name}
                    </div>
                    <div className="text-text-secondary text-xs truncate">
                      {field.type}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Collapsed state info */}
        {!expanded && data.fields.length > 0 && (
          <div className="px-4 py-2 text-xs text-text-secondary bg-bg-tertiary/50 text-center">
            {data.fields.length} field{data.fields.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    // Shallow comparison - only re-render if isSelected or data reference changed
    return (
      prev.isSelected === next.isSelected &&
      prev.data === next.data
    );
  }
);

DatabaseTableNode.displayName = 'DatabaseTableNode';
