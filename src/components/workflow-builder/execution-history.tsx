/**
 * Execution History Component
 *
 * Production-grade execution history with Linear/Vercel-inspired styling.
 * Features:
 * - Status dots (not full icons)
 * - Relative time display ("2m ago")
 * - Actions visible on hover
 * - Skeleton loading states
 * - Clean card design
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { WorkflowStatus } from '@/lib/graph/enums';
import type { WorkflowExecution } from '@/lib/db/repositories/workflow.repository';
import { Skeleton } from '@/components/shared/skeleton';
import { formatRelativeTime } from '@/lib/design-system';

// ============================================================================
// Types & Config
// ============================================================================

interface StatusConfig {
  dotColor: string;
  textColor: string;
  label: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  pending: { dotColor: 'bg-text-tertiary', textColor: 'text-text-tertiary', label: 'Pending' },
  running: { dotColor: 'bg-accent-primary animate-pulse', textColor: 'text-accent-primary', label: 'Running' },
  paused: { dotColor: 'bg-accent-warning', textColor: 'text-accent-warning', label: 'Paused' },
  completed: { dotColor: 'bg-accent-success', textColor: 'text-accent-success', label: 'Completed' },
  failed: { dotColor: 'bg-accent-error', textColor: 'text-accent-error', label: 'Failed' },
};

const defaultStatusConfig: StatusConfig = {
  dotColor: 'bg-text-tertiary',
  textColor: 'text-text-tertiary',
  label: 'Unknown',
};

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  const end = completedAt ?? new Date();
  const durationMs = end.getTime() - startedAt.getTime();

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ExecutionHistorySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary"
        >
          <Skeleton variant="circular" className="w-8 h-8" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-24 h-3" />
            <Skeleton className="w-32 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

interface ExecutionHistoryProps {
  workflowId: string;
  onSelect?: (executionId: string) => void;
  onRetry?: (executionId: string) => void;
}

export function ExecutionHistory({
  workflowId,
  onSelect,
  onRetry,
}: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExecutions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/workflows/${workflowId}/executions`);
        if (!response.ok) throw new Error('Failed to fetch executions');
        const data = (await response.json()) as WorkflowExecution[];
        setExecutions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setIsLoading(false);
      }
    }

    fetchExecutions();

    // Poll while any execution is active
    const interval = setInterval(() => {
      if (
        executions.some(
          (e) =>
            e.status === WorkflowStatus.Running ||
            e.status === WorkflowStatus.Paused
        )
      ) {
        fetchExecutions();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [workflowId, executions]);

  // Loading state
  if (isLoading && executions.length === 0) {
    return <ExecutionHistorySkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-accent-error">
        <ExclamationCircleIcon className="w-5 h-5 mr-2" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  // Empty state
  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border-subtle flex items-center justify-center mb-3">
          <PlayIcon className="w-5 h-5 text-text-tertiary" />
        </div>
        <p className="text-sm font-medium text-text-secondary mb-1">
          No executions yet
        </p>
        <p className="text-xs text-text-tertiary">
          Run the workflow to see history
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {executions.map((execution) => {
        const config = statusConfigs[execution.status] ?? defaultStatusConfig;
        const startedAt = new Date(execution.startedAt);
        const completedAt = execution.completedAt
          ? new Date(execution.completedAt)
          : null;
        const isActive =
          execution.status === WorkflowStatus.Running ||
          execution.status === WorkflowStatus.Paused;

        return (
          <div
            key={execution.id}
            className={`
              group flex items-center gap-3 p-3 rounded-lg cursor-pointer
              bg-bg-tertiary hover:bg-bg-hover
              border border-transparent hover:border-border-subtle
              transition-all duration-150
              ${isActive ? 'border-accent-primary/30' : ''}
            `}
            onClick={() => onSelect?.(execution.id)}
          >
            {/* Status dot */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-secondary">
              <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${config.textColor}`}>
                  {config.label}
                </span>
                <span className="text-xs text-text-tertiary">
                  {formatRelativeTime(startedAt)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
                <span>{formatDuration(startedAt, completedAt)}</span>
                {execution.currentNode && (
                  <>
                    <span className="text-border-default">•</span>
                    <span className="truncate max-w-[100px]">
                      {execution.currentNode}
                    </span>
                  </>
                )}
              </div>

              {execution.lastError && (
                <p
                  className="mt-1 text-xs text-accent-error truncate"
                  title={execution.lastError}
                >
                  {execution.lastError}
                </p>
              )}
            </div>

            {/* Actions (visible on hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {execution.status === WorkflowStatus.Failed && onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(execution.id);
                  }}
                  className={`
                    p-1.5 rounded-md
                    text-text-tertiary hover:text-text-primary
                    hover:bg-bg-secondary
                    transition-colors
                  `}
                  title="Retry"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>
              )}
              <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
