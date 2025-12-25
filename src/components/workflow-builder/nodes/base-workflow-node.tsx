/**
 * Base Workflow Node Component
 *
 * Custom React Flow node that renders workflow nodes with:
 * - Type-specific icons and colors
 * - Selection highlighting
 * - Execution status indicators
 * - Connection handles
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import {
  CpuChipIcon,
  CommandLineIcon,
  BoltIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import { NodeType } from '@/lib/graph/enums';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';
import { useWorkflowExecutionStore } from '@/store';

// Custom NodeProps type for our workflow nodes
interface WorkflowNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export type WorkflowNodeType = Node<WorkflowNodeData>;

// ============================================================================
// Node Type Configuration
// ============================================================================

interface NodeTypeConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const nodeTypeConfigs: Record<NodeType, NodeTypeConfig> = {
  [NodeType.Agent]: {
    icon: CpuChipIcon,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/50',
  },
  [NodeType.Command]: {
    icon: CommandLineIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50',
  },
  [NodeType.SlashCommand]: {
    icon: BoltIcon,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/50',
  },
  [NodeType.Eval]: {
    icon: CodeBracketIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
  },
  [NodeType.Http]: {
    icon: GlobeAltIcon,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/50',
  },
  [NodeType.Llm]: {
    icon: ChatBubbleLeftRightIcon,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/50',
  },
  [NodeType.DynamicAgent]: {
    icon: CogIcon,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/50',
  },
  [NodeType.DynamicCommand]: {
    icon: PlayCircleIcon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/50',
  },
  [NodeType.GitHubProject]: {
    icon: CodeBracketIcon,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/50',
  },
};

// ============================================================================
// Component
// ============================================================================

function BaseWorkflowNode({ id, data, selected }: WorkflowNodeProps) {
  const nodeState = useWorkflowExecutionStore((s) => s.nodeStates[id]);
  const currentNodeId = useWorkflowExecutionStore((s) => s.currentNodeId);

  const config = nodeTypeConfigs[data.nodeType] ?? nodeTypeConfigs[NodeType.Command];
  const Icon = config.icon;

  const isRunning = currentNodeId === id || nodeState?.status === 'running';
  const isCompleted = nodeState?.status === 'completed';
  const isFailed = nodeState?.status === 'failed';

  // Status-based styling
  let statusBorder = '';
  let statusGlow = '';
  if (isRunning) {
    statusBorder = 'border-yellow-400';
    statusGlow = 'shadow-lg shadow-yellow-400/30';
  } else if (isCompleted) {
    statusBorder = 'border-green-400';
  } else if (isFailed) {
    statusBorder = 'border-red-400';
  }

  return (
    <div
      className={`
        relative min-w-[180px] rounded-lg border-2 transition-all duration-200
        ${config.bgColor} ${statusBorder || config.borderColor}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900' : ''}
        ${statusGlow}
        ${isRunning ? 'animate-pulse' : ''}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-600 hover:!bg-blue-400 transition-colors"
      />

      {/* Node Content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded ${config.bgColor}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <span className="text-sm font-medium text-gray-200 truncate">
            {data.label}
          </span>
        </div>

        {/* Type Badge */}
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
            {data.nodeType}
          </span>

          {/* Status indicator */}
          {nodeState && (
            <span
              className={`
                text-xs px-2 py-0.5 rounded
                ${isRunning ? 'bg-yellow-500/20 text-yellow-400' : ''}
                ${isCompleted ? 'bg-green-500/20 text-green-400' : ''}
                ${isFailed ? 'bg-red-500/20 text-red-400' : ''}
              `}
            >
              {nodeState.status}
            </span>
          )}
        </div>

        {/* Preview of config (truncated) */}
        <div className="mt-2 text-xs text-gray-400 truncate">
          {getConfigPreview(data)}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-600 hover:!bg-blue-400 transition-colors"
      />
    </div>
  );
}

/**
 * Get a preview string for the node configuration
 */
function getConfigPreview(data: WorkflowNodeData): string {
  const config = data.config;

  switch (config.type) {
    case 'agent':
      return config.prompt.slice(0, 50) + (config.prompt.length > 50 ? '...' : '');
    case 'command':
      return config.command.slice(0, 50) + (config.command.length > 50 ? '...' : '');
    case 'slash-command':
      return `/${config.command} ${config.args}`.slice(0, 50);
    case 'eval':
      return config.code.split('\n')[0]?.slice(0, 50) ?? '';
    case 'http':
      return `${config.method} ${config.url}`.slice(0, 50);
    case 'llm':
      return config.prompt.slice(0, 50) + (config.prompt.length > 50 ? '...' : '');
    default:
      return '';
  }
}

export const WorkflowNode = memo(BaseWorkflowNode);
