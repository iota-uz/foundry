/**
 * Kanban Column Component
 *
 * A single status column on the Kanban board.
 * Features:
 * - Terminal-inspired header with command prompt aesthetic
 * - Drop zone for issues
 * - Status-specific accent colors
 * - Glowing border effect on drag over
 */

'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { IssueCard } from './issue-card';
import { getKanbanStatusColor } from '@/lib/design-system';
import type { KanbanColumn as ColumnType, KanbanIssue } from '@/store/kanban.store';

// ============================================================================
// Types
// ============================================================================

interface KanbanColumnProps {
  column: ColumnType;
  issues: KanbanIssue[];
  projectId: string;
  isOver?: boolean;
  onIssueClick?: (issue: KanbanIssue) => void;
}

// ============================================================================
// Component
// ============================================================================

export function KanbanColumn({ column, issues, projectId, isOver, onIssueClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.name,
    data: {
      type: 'column',
      column,
    },
  });

  const colors = getKanbanStatusColor(column.name);
  const issueIds = issues.map((issue) => issue.id);

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col
        min-w-[320px] max-w-[380px] w-[320px]
        h-full min-h-0
        bg-bg-primary/50
        border rounded-xl
        transition-all duration-200 ease-out
        ${isOver === true
          ? `${colors.border.replace('/30', '/50')} ${colors.glow} shadow-lg ring-1 ring-white/10`
          : 'border-border-subtle'
        }
      `}
    >
      {/* Column Header - Terminal Style */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm rounded-t-xl border-b border-border-subtle">
        <div className="p-3">
          {/* Terminal prompt line */}
          <div className="flex items-center gap-2 mb-1.5 text-[10px] font-mono text-text-tertiary">
            <span className="text-emerald-400">$</span>
            <span>column</span>
            <span className="text-text-muted">--status</span>
          </div>

          {/* Column title and count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Status indicator dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full ${colors.text.replace('text-', 'bg-')}`}
                style={{
                  boxShadow: isOver === true
                    ? `0 0 8px 2px currentColor`
                    : '0 0 4px 1px currentColor',
                }}
              />
              <h3 className={`font-semibold text-sm ${colors.text}`}>
                {column.name}
              </h3>
            </div>

            {/* Issue count badge */}
            <div
              className={`
                px-2 py-0.5 rounded-full
                bg-bg-tertiary border border-border-subtle
                text-xs font-mono font-medium text-text-secondary
              `}
            >
              {issues.length}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} projectId={projectId} onClick={onIssueClick} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {issues.length === 0 && (
          <div
            className={`
              flex flex-col items-center justify-center
              py-8 px-4
              border border-dashed border-border-subtle rounded-lg
              ${isOver === true ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
              transition-all duration-200
            `}
          >
            <div className="font-mono text-xs text-text-muted mb-1">
              {isOver === true ? '[ drop here ]' : '[ empty ]'}
            </div>
            <p className="text-xs text-text-tertiary">
              {isOver === true ? 'Release to add issue' : 'No issues in this column'}
            </p>
          </div>
        )}

        {/* Drop indicator when dragging over */}
        {isOver === true && issues.length > 0 && (
          <div
            className={`
              h-1 rounded-full
              bg-gradient-to-r from-transparent via-emerald-500 to-transparent
              animate-pulse
            `}
          />
        )}
      </div>

      {/* Bottom glow effect */}
      <div
        className={`
          absolute bottom-0 left-4 right-4 h-px
          bg-gradient-to-r from-transparent via-white/10 to-transparent
          ${isOver === true ? 'opacity-100' : 'opacity-0'}
          transition-opacity duration-300
        `}
      />
    </div>
  );
}
