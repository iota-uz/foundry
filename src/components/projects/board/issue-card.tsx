/**
 * Issue Card Component
 *
 * Draggable card displaying a GitHub issue on the Kanban board.
 * Features:
 * - Industrial/terminal-inspired styling
 * - Draggable with visual feedback
 * - Shows issue metadata (number, repo, labels)
 * - Hover effects with circuit-board aesthetic
 * - Click to open detail panel (without interfering with drag)
 */

'use client';

import React, { useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanIssue } from '@/store/kanban.store';

// ============================================================================
// Types
// ============================================================================

interface IssueCardProps {
  issue: KanbanIssue;
  projectId: string;
  isDragOverlay?: boolean;
  onClick?: ((issue: KanbanIssue) => void) | undefined;
}

// ============================================================================
// Component
// ============================================================================

export function IssueCard({ issue, projectId: _projectId, isDragOverlay = false, onClick }: IssueCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: {
      type: 'issue',
      issue,
    },
  });

  // Track mouse position to distinguish click from drag
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const dragThreshold = 5; // pixels

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!mouseDownPos.current || !onClick) return;

      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);

      // Only trigger click if mouse didn't move much (not a drag)
      if (dx < dragThreshold && dy < dragThreshold) {
        onClick(issue);
      }

      mouseDownPos.current = null;
    },
    [onClick, issue]
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`
        group relative
        bg-bg-secondary border border-border-default rounded-lg
        transition-all duration-200 ease-out
        cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-40 scale-[0.98]' : ''}
        ${isDragOverlay ? 'shadow-2xl shadow-emerald-500/20 ring-1 ring-emerald-500/50' : ''}
        hover:border-border-hover hover:bg-bg-tertiary
        hover:shadow-lg hover:shadow-black/20
      `}
    >
      {/* Scan-line overlay on hover */}
      <div
        className={`
          absolute inset-0 rounded-lg pointer-events-none
          opacity-0 group-hover:opacity-100
          transition-opacity duration-300
          bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent
          bg-[length:100%_4px]
        `}
      />

      {/* Card content */}
      <div className="relative p-3 space-y-2">
        {/* Header: Issue number and repo */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-emerald-400 font-medium">
            #{issue.number}
          </span>
          <span className="font-mono text-text-tertiary truncate max-w-[140px]">
            {issue.owner}/{issue.repo}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-text-primary leading-snug line-clamp-2">
          {issue.title}
        </h4>

        {/* Labels */}
        {issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {issue.labels.slice(0, 3).map((label) => (
              <span
                key={label.name}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
                  border: `1px solid #${label.color}40`,
                }}
              >
                {label.name}
              </span>
            ))}
            {issue.labels.length > 3 && (
              <span className="text-[10px] text-text-tertiary font-mono">
                +{issue.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Assignees */}
        {issue.assignees.length > 0 && (
          <div className="flex items-center gap-1 pt-1">
            <div className="flex -space-x-1.5">
              {issue.assignees.slice(0, 3).map((assignee, index) => (
                <div
                  key={assignee}
                  className={`
                    w-5 h-5 rounded-full
                    bg-gradient-to-br from-emerald-500/30 to-teal-500/30
                    border border-border-default
                    flex items-center justify-center
                    text-[9px] font-mono font-bold text-text-primary uppercase
                  `}
                  style={{ zIndex: 3 - index }}
                  title={assignee}
                >
                  {assignee.charAt(0)}
                </div>
              ))}
            </div>
            {issue.assignees.length > 3 && (
              <span className="text-[10px] text-text-tertiary font-mono ml-1">
                +{issue.assignees.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className={`
          absolute bottom-0 left-2 right-2 h-px
          bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent
          opacity-0 group-hover:opacity-100
          transition-opacity duration-300
        `}
      />
    </div>
  );
}

// ============================================================================
// Drag Overlay Version
// ============================================================================

export function IssueCardOverlay({ issue, projectId }: { issue: KanbanIssue; projectId: string }) {
  return <IssueCard issue={issue} projectId={projectId} isDragOverlay />;
}
