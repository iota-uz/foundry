/**
 * Base Workflow Node Component
 *
 * Production-grade React Flow node with Linear/Vercel-inspired styling.
 * Features:
 * - Typed ports with color-coded handles
 * - Special Trigger node with pill shape
 * - Centralized node colors from design system
 * - Hover tooltips for port types
 * - Status indicators for execution state
 */

'use client';

import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getNodeColor, getStatusColor } from '@/lib/design-system';
import { getNodePortSchema } from '@/lib/workflow-builder/port-registry';
import { getPortColorClasses, type PortDefinition } from '@/lib/workflow-builder/port-types';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';
import { useWorkflowExecutionStore } from '@/store';
import { NodeType } from '@/lib/graph/enums';

// ============================================================================
// Types
// ============================================================================

interface WorkflowNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

// ============================================================================
// Port Handle Component
// ============================================================================

interface PortHandleProps {
  port: PortDefinition;
  type: 'source' | 'target';
  position: Position;
  index: number;
  total: number;
}

function PortHandle({ port, type, position, index, total }: PortHandleProps) {
  const colorClasses = getPortColorClasses(port.type);

  // Calculate horizontal position for multiple handles
  const leftPercent = ((index + 1) / (total + 1)) * 100;

  return (
    <div
      className="group/port relative"
      style={{ left: `${leftPercent}%`, position: 'absolute' }}
    >
      <Handle
        type={type}
        position={position}
        id={port.id}
        className={`
          !w-3 !h-3 !transform !-translate-x-1/2
          ${position === Position.Top ? '!-top-1.5' : '!-bottom-1.5'}
          ${colorClasses.bg} !border-2 !border-bg-primary
          hover:!scale-150 hover:!z-10
          transition-all duration-150
        `}
      />
      {/* Tooltip */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 whitespace-nowrap
          px-2 py-1 rounded text-[10px] font-medium
          bg-bg-elevated border border-border-default shadow-lg
          opacity-0 group-hover/port:opacity-100
          pointer-events-none transition-opacity duration-150
          z-20
          ${position === Position.Top ? 'bottom-5' : 'top-5'}
        `}
      >
        <span className={colorClasses.text}>{port.label}</span>
        <span className="text-text-tertiary ml-1">({port.type})</span>
      </div>
    </div>
  );
}

// ============================================================================
// Trigger Node Component
// ============================================================================

interface TriggerNodeContentProps {
  data: WorkflowNodeData;
  selected?: boolean | undefined;
}

function TriggerNodeContent({ data, selected }: TriggerNodeContentProps) {
  const colorConfig = getNodeColor(NodeType.Trigger);
  const Icon = colorConfig.icon;
  const portSchema = getNodePortSchema(NodeType.Trigger);

  return (
    <div
      className={`
        group relative min-w-[180px] rounded-full
        bg-bg-secondary border-2
        transition-all duration-200
        ${
          selected === true
            ? 'border-accent-primary shadow-lg shadow-accent-primary/20 ring-1 ring-accent-primary/30'
            : colorConfig.borderColor
        }
      `}
    >
      {/* No input handles for trigger - it's the entry point */}

      {/* Node Content */}
      <div className="px-5 py-3 flex items-center gap-3">
        {/* Icon */}
        <div
          className={`
            flex items-center justify-center
            w-10 h-10 rounded-full
            ${colorConfig.bgColor}
          `}
        >
          <Icon className={`w-5 h-5 ${colorConfig.textColor}`} />
        </div>

        {/* Label & Type */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">
            {data.label}
          </span>
          <span className="text-[10px] text-text-tertiary uppercase tracking-wide">
            Entry Point
          </span>
        </div>
      </div>

      {/* Output Handles */}
      <div className="absolute left-0 right-0 bottom-0 h-0">
        {portSchema.outputs.map((port, index) => (
          <PortHandle
            key={port.id}
            port={port}
            type="source"
            position={Position.Bottom}
            index={index}
            total={portSchema.outputs.length}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Regular Node Component
// ============================================================================

interface RegularNodeContentProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean | undefined;
}

function RegularNodeContent({ id, data, selected }: RegularNodeContentProps) {
  const nodeState = useWorkflowExecutionStore((s) => s.nodeStates[id]);
  const currentNodeId = useWorkflowExecutionStore((s) => s.currentNodeId);

  const colorConfig = getNodeColor(data.nodeType);
  const Icon = colorConfig.icon;
  const portSchema = useMemo(
    () => getNodePortSchema(data.nodeType),
    [data.nodeType]
  );

  const isRunning = currentNodeId === id || nodeState?.status === 'running';
  const isCompleted = nodeState?.status === 'completed';
  const isFailed = nodeState?.status === 'failed';

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
                : selected === true
                  ? 'border-accent-primary shadow-lg shadow-accent-primary/20'
                  : colorConfig.borderColor
        }
        ${selected === true ? 'ring-1 ring-accent-primary/30 ring-offset-1 ring-offset-bg-primary' : ''}
      `}
    >
      {/* Input Handles */}
      <div className="absolute left-0 right-0 top-0 h-0">
        {portSchema.inputs.map((port, index) => (
          <PortHandle
            key={port.id}
            port={port}
            type="target"
            position={Position.Top}
            index={index}
            total={portSchema.inputs.length}
          />
        ))}
      </div>

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

      {/* Output Handles */}
      <div className="absolute left-0 right-0 bottom-0 h-0">
        {portSchema.outputs.map((port, index) => (
          <PortHandle
            key={port.id}
            port={port}
            type="source"
            position={Position.Bottom}
            index={index}
            total={portSchema.outputs.length}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function BaseWorkflowNode({ id, data, selected }: WorkflowNodeProps) {
  // Render different component based on node type
  if (data.nodeType === NodeType.Trigger) {
    return <TriggerNodeContent data={data} selected={selected} />;
  }

  return <RegularNodeContent id={id} data={data} selected={selected} />;
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
    case 'trigger':
      return 'Workflow entry point';
    case 'agent':
      return truncate(config.prompt || 'No prompt configured');
    case 'command':
      return truncate(config.command !== undefined && config.command !== '' ? config.command : 'No command configured');
    case 'slash-command':
      return truncate(`/${config.command} ${config.args ?? ''}`);
    case 'eval':
      return truncate(config.code?.split('\n')[0] ?? 'No code configured');
    case 'http':
      return truncate(`${config.method} ${config.url ?? ''}`);
    case 'llm':
      return truncate(config.prompt !== undefined && config.prompt !== '' ? config.prompt : 'No prompt configured');
    case 'dynamic-agent':
      return 'Dynamic configuration at runtime';
    case 'dynamic-command':
      return 'Dynamic command at runtime';
    case 'github-project':
      return 'Update GitHub Project fields';
    case 'git-checkout':
      return config.useIssueContext ? 'Checkout from issue context' : `${config.owner}/${config.repo}`;
    default:
      return 'Configure this node';
  }
}

export const WorkflowNode = memo(BaseWorkflowNode);
