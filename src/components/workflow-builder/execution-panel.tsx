/**
 * Execution Panel Component
 *
 * Displays real-time execution state including:
 * - Execution status and controls
 * - Node execution progress
 * - Execution logs
 */

'use client';

import React, { useRef, useEffect } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowExecutionStore, useWorkflowBuilderStore } from '@/store';
import { WorkflowStatus } from '@/lib/graph/enums';

const statusColors: Record<string, string> = {
  pending: 'text-gray-400',
  running: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  paused: 'text-yellow-400',
  skipped: 'text-gray-500',
};

const statusIcons: Record<string, React.ElementType> = {
  pending: ClockIcon,
  running: ArrowPathIcon,
  completed: CheckCircleIcon,
  failed: ExclamationCircleIcon,
  paused: PauseIcon,
  skipped: XMarkIcon,
};

const logLevelColors: Record<string, string> = {
  debug: 'text-gray-500',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

interface ExecutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutionPanel({ isOpen, onClose }: ExecutionPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  const isRunning = status === WorkflowStatus.Running;
  const isPaused = status === WorkflowStatus.Paused;
  const isActive = isRunning || isPaused;
  const isFinished = status === WorkflowStatus.Completed || status === WorkflowStatus.Failed;

  const StatusIcon = statusIcons[status] ?? ClockIcon;

  // Get node labels for display
  const nodeLabels = nodes.reduce<Record<string, string>>((acc, node) => {
    acc[node.id] = node.data.label;
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-bg-secondary border-l border-border-default">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary">Execution</h3>
          <div className={`flex items-center gap-1 ${statusColors[status]}`}>
            <StatusIcon className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span className="text-sm capitalize">{status}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Close panel"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Controls */}
      {executionId && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-default">
          {isRunning && (
            <button
              onClick={() => pauseExecution()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-sm transition-colors"
            >
              <PauseIcon className="w-4 h-4" />
              Pause
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => resumeExecution()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-sm transition-colors"
            >
              <PlayIcon className="w-4 h-4" />
              Resume
            </button>
          )}
          {isActive && (
            <button
              onClick={() => cancelExecution()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
            >
              <StopIcon className="w-4 h-4" />
              Cancel
            </button>
          )}
          {isFinished && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-tertiary hover:bg-[#333333] text-text-secondary text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Node Progress */}
      <div className="px-4 py-3 border-b border-border-default">
        <h4 className="text-sm font-medium text-text-secondary mb-2">Node Progress</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {nodes.map((node) => {
            const nodeState = nodeStates[node.id];
            const nodeStatus = nodeState?.status ?? 'pending';
            const NodeStatusIcon = statusIcons[nodeStatus] ?? ClockIcon;
            const isCurrentNode = currentNodeId === node.id;

            return (
              <div
                key={node.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                  isCurrentNode ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-bg-tertiary'
                }`}
              >
                <NodeStatusIcon
                  className={`w-4 h-4 flex-shrink-0 ${statusColors[nodeStatus]} ${
                    nodeStatus === 'running' ? 'animate-spin' : ''
                  }`}
                />
                <span className="text-text-primary truncate flex-1">
                  {node.data.label}
                </span>
                {nodeState?.error && (
                  <span className="text-xs text-red-400 truncate max-w-[100px]" title={nodeState.error}>
                    {nodeState.error}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 border-b border-border-default">
          <h4 className="text-sm font-medium text-text-secondary">
            Logs ({logs.length})
          </h4>
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-text-tertiary text-center py-4">
              No logs yet
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2 hover:bg-bg-tertiary rounded px-1 py-0.5">
                  <span className="text-text-tertiary flex-shrink-0 w-20">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`flex-shrink-0 w-12 uppercase ${logLevelColors[log.level]}`}>
                    [{log.level}]
                  </span>
                  {log.nodeId && (
                    <span className="text-text-secondary flex-shrink-0 max-w-[80px] truncate" title={nodeLabels[log.nodeId] ?? log.nodeId}>
                      {nodeLabels[log.nodeId] ?? log.nodeId}:
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

      {/* Execution ID footer */}
      {executionId && (
        <div className="px-4 py-2 border-t border-border-default">
          <span className="text-xs text-text-tertiary">
            ID: {executionId.slice(0, 8)}...
          </span>
        </div>
      )}
    </div>
  );
}
