/**
 * Base Workflow Node Component
 *
 * Production-grade React Flow node with Linear/Vercel-inspired styling.
 * Features:
 * - Centralized node colors from design system
 * - Larger handles (16px) with hover scale
 * - Subtle border animation for running state (not pulse)
 * - Better selection state with glow
 * - Type badge with contrasting style
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getNodeColor, getStatusColor } from '@/lib/design-system';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';
import { useWorkflowExecutionStore } from '@/store';

// ============================================================================
// Types
// ============================================================================

interface WorkflowNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

function BaseWorkflowNode({ id, data, selected }: WorkflowNodeProps) {
  const nodeState = useWorkflowExecutionStore((s) => s.nodeStates[id]);
  const currentNodeId = useWorkflowExecutionStore((s) => s.currentNodeId);

  const colorConfig = getNodeColor(data.nodeType);
  const Icon = colorConfig.icon;

  const isRunning = currentNodeId === id || nodeState?.status === 'running';
  const isCompleted = nodeState?.status === 'completed';
  const isFailed = nodeState?.status === 'failed';

  // Get status color config
  const statusConfig = isRunning
    ? getStatusColor('running')
    : isCompleted
      ? getStatusColor('completed')
      : isFailed
        ? getStatusColor('failed')
        : null;

  return (
    <div
      className={`
        group relative min-w-[200px] rounded-lg
        bg-bg-secondary border-2
        transition-all duration-200
        ${
          isRunning
            ? 'border-accent-warning animate-border-pulse'
            : isCompleted
              ? 'border-accent-success'
              : isFailed
                ? 'border-accent-error'
                : selected
                  ? 'border-accent-primary shadow-lg shadow-accent-primary/20'
                  : colorConfig.borderColor
        }
        ${selected ? 'ring-1 ring-accent-primary/30 ring-offset-1 ring-offset-bg-primary' : ''}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={`
          !w-4 !h-4 !-top-2
          !bg-bg-tertiary !border-2 !border-border-default
          hover:!bg-accent-primary hover:!border-accent-primary hover:!scale-125
          transition-all duration-150
        `}
      />

      {/* Node Content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          {/* Icon container */}
          <div
            className={`
              flex items-center justify-center
              w-8 h-8 rounded-md
              ${colorConfig.bgColor}
            `}
          >
            <Icon className={`w-4 h-4 ${colorConfig.textColor}`} />
          </div>

          {/* Label */}
          <span className="text-sm font-medium text-text-primary truncate flex-1">
            {data.label}
          </span>

          {/* Running indicator */}
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent-warning animate-pulse-subtle" />
            </div>
          )}
        </div>

        {/* Type Badge & Status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Type badge */}
          <span
            className={`
              inline-flex items-center
              text-[10px] font-medium uppercase tracking-wide
              px-1.5 py-0.5 rounded
              ${colorConfig.bgColor} ${colorConfig.textColor}
            `}
          >
            {data.nodeType}
          </span>

          {/* Status badge */}
          {statusConfig && (
            <span
              className={`
                inline-flex items-center gap-1
                text-[10px] font-medium
                px-1.5 py-0.5 rounded
                ${statusConfig.bgColor} ${statusConfig.textColor}
              `}
            >
              {isRunning && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
              {nodeState?.status}
            </span>
          )}
        </div>

        {/* Config Preview */}
        <div className="mt-2.5 pt-2 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary truncate leading-relaxed">
            {getConfigPreview(data)}
          </p>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={`
          !w-4 !h-4 !-bottom-2
          !bg-bg-tertiary !border-2 !border-border-default
          hover:!bg-accent-primary hover:!border-accent-primary hover:!scale-125
          transition-all duration-150
        `}
      />
    </div>
  );
}

// ============================================================================
// Config Preview Helper
// ============================================================================

function getConfigPreview(data: WorkflowNodeData): string {
  const config = data.config;
  const maxLength = 60;

  const truncate = (str: string) =>
    str.length > maxLength ? str.slice(0, maxLength) + '...' : str;

  switch (config.type) {
    case 'agent':
      return truncate(config.prompt || 'No prompt configured');
    case 'command':
      return truncate(config.command || 'No command configured');
    case 'slash-command':
      return truncate(`/${config.command} ${config.args || ''}`);
    case 'eval':
      return truncate(config.code?.split('\n')[0] || 'No code configured');
    case 'http':
      return truncate(`${config.method} ${config.url || ''}`);
    case 'llm':
      return truncate(config.prompt || 'No prompt configured');
    case 'dynamic-agent':
      return 'Dynamic configuration at runtime';
    case 'dynamic-command':
      return 'Dynamic command at runtime';
    default:
      return 'Configure this node';
  }
}

export const WorkflowNode = memo(BaseWorkflowNode);
