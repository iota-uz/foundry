/**
 * Execution Panel Component
 *
 * Production-grade execution panel with Linear/Vercel-inspired styling.
 * Features:
 * - Pulsing dot status indicator
 * - Timeline layout for node progress
 * - Log viewer with filtering and search
 * - Clean minimal design
 */

'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowExecutionStore, useWorkflowBuilderStore } from '@/store';
import { WorkflowStatus } from '@/lib/graph/enums';
import { getStatusColor } from '@/lib/design-system';
import { Button } from '@/components/shared/button';

// ============================================================================
// Types
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ExecutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ExecutionPanel({ isOpen, onClose }: ExecutionPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [logFilter, setLogFilter] = useState<LogLevel | 'all'>('all');
  const [logSearch, setLogSearch] = useState('');

  const {
    executionId,
    status,
    currentNodeId,
    nodeStates,
    logs,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    reset,
  } = useWorkflowExecutionStore();

  const nodes = useWorkflowBuilderStore((s) => s.nodes);

  // Get status config
  const statusConfig = getStatusColor(status as 'running' | 'completed' | 'failed' | 'pending');

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesLevel = logFilter === 'all' || log.level === logFilter;
      const matchesSearch =
        !logSearch ||
        log.message.toLowerCase().includes(logSearch.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [logs, logFilter, logSearch]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredLogs]);

  if (!isOpen) return null;

  const isRunning = status === WorkflowStatus.Running;
  const isPaused = status === WorkflowStatus.Paused;
  const isActive = isRunning || isPaused;
  const isFinished =
    status === WorkflowStatus.Completed || status === WorkflowStatus.Failed;

  // Get node labels
  const nodeLabels = nodes.reduce<Record<string, string>>((acc, node) => {
    acc[node.id] = node.data.label;
    return acc;
  }, {});

  const copyLogs = () => {
    const text = filteredLogs
      .map((log) => `[${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-bg-secondary border-l border-border-default">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border-default">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Execution</h3>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={`
                w-2 h-2 rounded-full
                ${isRunning ? 'bg-accent-primary animate-pulse-subtle' : ''}
                ${isPaused ? 'bg-accent-warning' : ''}
                ${status === WorkflowStatus.Completed ? 'bg-accent-success' : ''}
                ${status === WorkflowStatus.Failed ? 'bg-accent-error' : ''}
                ${status === WorkflowStatus.Pending || !status ? 'bg-text-tertiary' : ''}
              `}
            />
            <span className={`text-xs font-medium capitalize ${statusConfig?.textColor || 'text-text-tertiary'}`}>
              {status || 'Idle'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
          aria-label="Close panel"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      {executionId && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
          {isRunning && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => pauseExecution()}
              icon={<PauseIcon className="w-4 h-4" />}
            >
              Pause
            </Button>
          )}
          {isPaused && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => resumeExecution()}
              icon={<PlayIcon className="w-4 h-4" />}
            >
              Resume
            </Button>
          )}
          {isActive && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => cancelExecution()}
              icon={<StopIcon className="w-4 h-4" />}
            >
              Cancel
            </Button>
          )}
          {isFinished && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Node Progress - Timeline Layout */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
          Node Progress
        </h4>
        <div className="space-y-0 max-h-48 overflow-y-auto">
          {nodes.map((node, index) => {
            const nodeState = nodeStates[node.id];
            const nodeStatus = nodeState?.status ?? 'pending';
            const isCurrentNode = currentNodeId === node.id;
            const nodeStatusConfig = getStatusColor(
              nodeStatus as 'running' | 'completed' | 'failed' | 'pending'
            );

            return (
              <div key={node.id} className="flex items-start gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <div
                    className={`
                      w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5
                      ${nodeStatus === 'running' ? 'bg-accent-primary animate-pulse' : ''}
                      ${nodeStatus === 'completed' ? 'bg-accent-success' : ''}
                      ${nodeStatus === 'failed' ? 'bg-accent-error' : ''}
                      ${nodeStatus === 'pending' ? 'bg-bg-tertiary border border-border-default' : ''}
                    `}
                  />
                  {/* Line */}
                  {index < nodes.length - 1 && (
                    <div
                      className={`
                        w-0.5 flex-1 min-h-[20px]
                        ${nodeStatus === 'completed' ? 'bg-accent-success/30' : 'bg-border-subtle'}
                      `}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  className={`
                    flex-1 pb-3
                    ${isCurrentNode ? 'opacity-100' : 'opacity-70'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {node.data.label}
                    </span>
                    {nodeState && (
                      <span
                        className={`
                          text-[10px] font-medium uppercase px-1.5 py-0.5 rounded
                          ${nodeStatusConfig?.bgColor} ${nodeStatusConfig?.textColor}
                        `}
                      >
                        {nodeState.status}
                      </span>
                    )}
                  </div>
                  {nodeState?.error && (
                    <p
                      className="text-xs text-accent-error mt-0.5 truncate"
                      title={nodeState.error}
                    >
                      {nodeState.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Log Header with Filters */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Logs
            </h4>
            <span className="text-xs text-text-tertiary">
              ({filteredLogs.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter tabs */}
            <div className="flex items-center bg-bg-tertiary rounded-md p-0.5">
              {(['all', 'info', 'warn', 'error'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setLogFilter(level)}
                  className={`
                    px-2 py-1 text-xs font-medium rounded
                    transition-colors duration-150
                    ${logFilter === level
                      ? 'bg-bg-secondary text-text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                    }
                  `}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>

            {/* Copy button */}
            <button
              onClick={copyLogs}
              className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
              title="Copy logs"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border-subtle">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className={`
                w-full h-8 pl-8 pr-3
                bg-bg-tertiary border border-border-subtle
                rounded-md text-sm text-text-primary
                placeholder:text-text-tertiary
                focus:outline-none focus:border-accent-primary
                transition-colors
              `}
            />
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-text-tertiary text-center py-8">
              {logs.length === 0 ? 'No logs yet' : 'No matching logs'}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-2 hover:bg-bg-tertiary rounded px-2 py-1"
                >
                  <span className="text-text-tertiary flex-shrink-0 w-16 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`
                      flex-shrink-0 w-12 uppercase font-medium
                      ${log.level === 'error' ? 'text-accent-error' : ''}
                      ${log.level === 'warn' ? 'text-accent-warning' : ''}
                      ${log.level === 'info' ? 'text-accent-primary' : ''}
                      ${log.level === 'debug' ? 'text-text-tertiary' : ''}
                    `}
                  >
                    {log.level}
                  </span>
                  {log.nodeId && (
                    <span
                      className="text-text-secondary flex-shrink-0 max-w-[60px] truncate"
                      title={nodeLabels[log.nodeId] ?? log.nodeId}
                    >
                      {nodeLabels[log.nodeId] ?? log.nodeId}
                    </span>
                  )}
                  <span className="text-text-primary break-all">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {executionId && (
        <div className="px-4 py-2 border-t border-border-subtle">
          <span className="text-xs text-text-tertiary font-mono">
            ID: {executionId.slice(0, 8)}
          </span>
        </div>
      )}
    </div>
  );
}
