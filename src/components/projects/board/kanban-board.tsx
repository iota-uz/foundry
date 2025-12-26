/**
 * Kanban Board Component
 *
 * Main container for the GitHub-synced Kanban board.
 * Features:
 * - Horizontal scrolling columns
 * - Drag-and-drop coordination
 * - Industrial command-center aesthetic
 * - Scan-line overlay effect
 */

'use client';

import React, { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { IssueCardOverlay } from './issue-card';
import {
  useKanbanStore,
  useFilteredIssues,
  type KanbanIssue,
} from '@/store/kanban.store';

// ============================================================================
// Component
// ============================================================================

export function KanbanBoard() {
  const columns = useKanbanStore((state) => state.columns);
  const activeIssueId = useKanbanStore((state) => state.activeIssueId);
  const overColumnId = useKanbanStore((state) => state.overColumnId);
  const setActiveIssue = useKanbanStore((state) => state.setActiveIssue);
  const setOverColumn = useKanbanStore((state) => state.setOverColumn);
  const setSelectedIssue = useKanbanStore((state) => state.setSelectedIssue);
  const moveIssue = useKanbanStore((state) => state.moveIssue);

  // Handle issue click - open detail panel
  const handleIssueClick = (issue: KanbanIssue) => {
    setSelectedIssue(issue.id);
  };

  const filteredIssues = useFilteredIssues();

  // Get active issue for drag overlay
  const activeIssue = useMemo(() => {
    if (activeIssueId === undefined || activeIssueId === null || activeIssueId === '') return null;
    return filteredIssues.find((issue) => issue.id === activeIssueId) || null;
  }, [activeIssueId, filteredIssues]);

  // Group issues by column
  const issuesByColumn = useMemo(() => {
    const grouped: Record<string, KanbanIssue[]> = {};
    columns.forEach((col) => {
      grouped[col.name] = filteredIssues.filter((issue) => issue.status === col.name);
    });
    return grouped;
  }, [columns, filteredIssues]);

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveIssue(active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    if (over) {
      // Check if over a column or an issue
      const overData = over.data.current as { type?: string; column?: { name: string }; issue?: { status: string } } | undefined;
      if (overData?.type === 'column') {
        setOverColumn(overData.column?.name ?? null);
      } else if (overData?.type === 'issue') {
        setOverColumn(overData.issue?.status ?? null);
      }
    } else {
      setOverColumn(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveIssue(null);
    setOverColumn(null);

    if (!over) return;

    const activeIssue = filteredIssues.find((i) => i.id === active.id);
    if (!activeIssue) return;

    // Determine target column
    const overData = over.data.current as { type?: string; column?: { name: string }; issue?: { status: string } } | undefined;
    let targetStatus: string | null = null;

    if (overData?.type === 'column') {
      targetStatus = overData.column?.name ?? null;
    } else if (overData?.type === 'issue') {
      targetStatus = overData.issue?.status ?? null;
    }

    if (targetStatus !== null && targetStatus !== '' && targetStatus !== activeIssue.status) {
      void moveIssue(activeIssue.id, targetStatus);
    }
  };

  const handleDragCancel = () => {
    setActiveIssue(null);
    setOverColumn(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="relative flex-1 overflow-hidden">
        {/* Scan-line overlay for industrial aesthetic */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-[0.015]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(16, 185, 129, 0.1) 2px,
              rgba(16, 185, 129, 0.1) 4px
            )`,
          }}
        />

        {/* Corner decorations */}
        <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-emerald-500/20 rounded-tl-lg pointer-events-none z-10" />
        <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-emerald-500/20 rounded-tr-lg pointer-events-none z-10" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-emerald-500/20 rounded-bl-lg pointer-events-none z-10" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-emerald-500/20 rounded-br-lg pointer-events-none z-10" />

        {/* Columns container */}
        <div className="h-full overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-4 h-full min-w-max">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                issues={issuesByColumn[column.name] || []}
                isOver={overColumnId === column.name}
                onIssueClick={handleIssueClick}
              />
            ))}

            {/* Empty state when no columns */}
            {columns.length === 0 && (
              <div className="flex-1 flex items-center justify-center min-w-[400px]">
                <div className="text-center">
                  <div className="font-mono text-sm text-text-tertiary mb-2">
                    [ no columns configured ]
                  </div>
                  <p className="text-xs text-text-muted">
                    Sync with GitHub to load project columns
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay - follows cursor */}
      <DragOverlay dropAnimation={null}>
        {activeIssue ? <IssueCardOverlay issue={activeIssue} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
