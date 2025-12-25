/**
 * Execution History Component
 *
 * Displays a list of past workflow executions with:
 * - Status and timing
 * - Quick actions (view details, retry)
 * - Error messages for failed executions
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { WorkflowStatus } from '@/lib/graph/enums';
import type { WorkflowExecution } from '@/lib/db/repositories/workflow.repository';

interface StatusConfig {
  icon: React.ElementType;
  color: string;
  bg: string;
}

const defaultStatusConfig: StatusConfig = {
  icon: ClockIcon,
  color: 'text-gray-400',
  bg: 'bg-gray-500/20'
};

const statusConfig: Record<string, StatusConfig> = {
  pending: defaultStatusConfig,
  running: { icon: ArrowPathIcon, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  paused: { icon: PauseIcon, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  completed: { icon: CheckCircleIcon, color: 'text-green-400', bg: 'bg-green-500/20' },
  failed: { icon: ExclamationCircleIcon, color: 'text-red-400', bg: 'bg-red-500/20' },
};

interface ExecutionHistoryProps {
  workflowId: string;
  onSelect?: (executionId: string) => void;
  onRetry?: (executionId: string) => void;
}

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  const end = completedAt ?? new Date();
  const durationMs = end.getTime() - startedAt.getTime();

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ExecutionHistory({ workflowId, onSelect, onRetry }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExecutions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/workflows/${workflowId}/executions`);
        if (!response.ok) {
          throw new Error('Failed to fetch executions');
        }
        const data = await response.json() as WorkflowExecution[];
        setExecutions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch executions');
      } finally {
        setIsLoading(false);
      }
    }

    fetchExecutions();

    // Poll for updates while any execution is running
    const interval = setInterval(() => {
      if (executions.some(e => e.status === WorkflowStatus.Running || e.status === WorkflowStatus.Paused)) {
        fetchExecutions();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [workflowId, executions]);

  if (isLoading && executions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-text-tertiary">
        <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-red-400">
        <ExclamationCircleIcon className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
        <PlayIcon className="w-8 h-8 mb-2 opacity-50" />
        <p>No executions yet</p>
        <p className="text-sm">Run the workflow to see execution history</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((execution) => {
        const config = statusConfig[execution.status] ?? defaultStatusConfig;
        const StatusIcon = config.icon;
        const startedAt = new Date(execution.startedAt);
        const completedAt = execution.completedAt ? new Date(execution.completedAt) : null;
        const isActive = execution.status === WorkflowStatus.Running || execution.status === WorkflowStatus.Paused;

        return (
          <div
            key={execution.id}
            className={`
              group flex items-center gap-3 p-3 rounded-lg cursor-pointer
              bg-bg-tertiary hover:bg-[#333333] transition-colors
              ${isActive ? 'ring-1 ring-blue-500/50' : ''}
            `}
            onClick={() => onSelect?.(execution.id)}
          >
            {/* Status Icon */}
            <div className={`p-2 rounded-full ${config.bg}`}>
              <StatusIcon className={`w-4 h-4 ${config.color} ${execution.status === 'running' ? 'animate-spin' : ''}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium capitalize ${config.color}`}>
                  {execution.status}
                </span>
                <span className="text-xs text-text-tertiary">
                  {formatTime(startedAt)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <span>Duration: {formatDuration(startedAt, completedAt)}</span>
                {execution.currentNode && (
                  <>
                    <span>•</span>
                    <span className="truncate">
                      {isActive ? 'At:' : 'Last:'} {execution.currentNode}
                    </span>
                  </>
                )}
              </div>

              {execution.lastError && (
                <p className="mt-1 text-xs text-red-400 truncate" title={execution.lastError}>
                  {execution.lastError}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {execution.status === WorkflowStatus.Failed && onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(execution.id);
                  }}
                  className="p-1.5 rounded hover:bg-bg-secondary text-text-tertiary hover:text-text-primary"
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
