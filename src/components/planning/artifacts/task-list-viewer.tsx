'use client';

/**
 * Task List Viewer
 *
 * Displays implementation tasks with complexity indicators, dependencies,
 * and acceptance criteria.
 */

import { useState, useMemo } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  LinkIcon,
  CheckCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import type { ImplementationTask } from '@/lib/planning/types';

// ============================================================================
// Types
// ============================================================================

interface TaskListViewerProps {
  tasks: ImplementationTask[];
  className?: string;
}

interface TaskCardProps {
  task: ImplementationTask;
  allTasks: ImplementationTask[];
  defaultExpanded?: boolean;
}

// ============================================================================
// Complexity Styling
// ============================================================================

const complexityConfig: Record<ImplementationTask['complexity'], { label: string; color: string; icon: string }> = {
  low: {
    label: 'Low',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: '1',
  },
  medium: {
    label: 'Medium',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: '2',
  },
  high: {
    label: 'High',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    icon: '3',
  },
};

// ============================================================================
// Task Card
// ============================================================================

function TaskCard({ task, allTasks, defaultExpanded = false }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = complexityConfig[task.complexity];

  // Resolve dependency names
  const dependencyNames = useMemo(() => {
    return task.dependsOn
      .map((depId) => {
        const depTask = allTasks.find((t) => t.id === depId);
        return depTask?.title ?? depId;
      })
      .filter(Boolean);
  }, [task.dependsOn, allTasks]);

  return (
    <div className="group rounded-lg border border-border-default bg-bg-secondary overflow-hidden hover:border-border-hover transition-colors">
      {/* Header */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Order number */}
        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-bg-tertiary border border-border-subtle flex items-center justify-center mt-0.5">
          <span className="text-xs font-mono font-bold text-text-tertiary">{task.order}</span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary leading-tight">
              {task.title}
            </h3>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Complexity badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
                {config.label}
              </span>

              {/* Expand icon */}
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-text-tertiary" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
              )}
            </div>
          </div>

          {/* Quick info row */}
          <div className="flex items-center gap-4 mt-1.5">
            {task.estimatedHours !== undefined && (
              <div className="flex items-center gap-1 text-text-tertiary">
                <ClockIcon className="w-3.5 h-3.5" />
                <span className="text-xs">{task.estimatedHours}h</span>
              </div>
            )}

            {dependencyNames.length > 0 && (
              <div className="flex items-center gap-1 text-text-tertiary">
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="text-xs">{dependencyNames.length} deps</span>
              </div>
            )}

            {task.acceptanceCriteria.length > 0 && (
              <div className="flex items-center gap-1 text-text-tertiary">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span className="text-xs">{task.acceptanceCriteria.length} criteria</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary border border-border-subtle"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border-subtle bg-bg-primary/50">
          {/* Description */}
          <div className="mb-4">
            <p className="text-sm text-text-secondary leading-relaxed">{task.description}</p>
          </div>

          {/* Dependencies */}
          {dependencyNames.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                Dependencies
              </h4>
              <div className="flex flex-wrap gap-2">
                {dependencyNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-bg-tertiary text-text-secondary border border-border-subtle"
                  >
                    <LinkIcon className="w-3 h-3 text-text-tertiary" />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Acceptance Criteria */}
          {task.acceptanceCriteria.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                Acceptance Criteria
              </h4>
              <ul className="space-y-1.5">
                {task.acceptanceCriteria.map((criterion, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-accent-success/50 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-secondary">{criterion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TaskListViewer({ tasks, className = '' }: TaskListViewerProps) {
  const [complexityFilter, setComplexityFilter] = useState<ImplementationTask['complexity'] | 'all'>('all');

  // Sort tasks by order
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.order - b.order);
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (complexityFilter === 'all') return sortedTasks;
    return sortedTasks.filter((t) => t.complexity === complexityFilter);
  }, [sortedTasks, complexityFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalHours = tasks.reduce((acc, t) => acc + (t.estimatedHours ?? 0), 0);
    const byComplexity = {
      low: tasks.filter((t) => t.complexity === 'low').length,
      medium: tasks.filter((t) => t.complexity === 'medium').length,
      high: tasks.filter((t) => t.complexity === 'high').length,
    };
    return { totalHours, byComplexity };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">No tasks yet</h3>
        <p className="text-xs text-text-tertiary max-w-xs">
          Implementation tasks will appear here as the planning process identifies work items.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with stats and filter */}
      <div className="flex items-center justify-between mb-4">
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-text-secondary">
            <span className="font-bold text-text-primary">{tasks.length}</span> tasks
          </div>
          {stats.totalHours > 0 && (
            <div className="flex items-center gap-1 text-sm text-text-secondary">
              <ClockIcon className="w-4 h-4" />
              <span className="font-bold text-text-primary">{stats.totalHours}</span>h total
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 p-0.5 bg-bg-tertiary rounded-lg">
          <button
            onClick={() => setComplexityFilter('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              complexityFilter === 'all'
                ? 'bg-bg-secondary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <FunnelIcon className="w-3.5 h-3.5" />
            All
          </button>
          {(['low', 'medium', 'high'] as const).map((complexity) => (
            <button
              key={complexity}
              onClick={() => setComplexityFilter(complexity)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                complexityFilter === complexity
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
              <span className="ml-1 opacity-60">({stats.byComplexity[complexity]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filteredTasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            allTasks={tasks}
            defaultExpanded={index === 0}
          />
        ))}
      </div>

      {filteredTasks.length === 0 && complexityFilter !== 'all' && (
        <div className="py-8 text-center">
          <p className="text-sm text-text-tertiary">
            No {complexityFilter} complexity tasks found.
          </p>
        </div>
      )}
    </div>
  );
}
