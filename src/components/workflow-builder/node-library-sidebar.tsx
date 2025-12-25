/**
 * Node Library Sidebar
 *
 * Displays available node types that can be dragged onto the canvas.
 */

'use client';

import React from 'react';
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

// ============================================================================
// Types
// ============================================================================

interface NodeTypeInfo {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>;
  color: string;
}

// ============================================================================
// Node Type Definitions
// ============================================================================

const nodeTypes: NodeTypeInfo[] = [
  {
    type: NodeType.Agent,
    label: 'Agent',
    description: 'AI agent with tools and conversation',
    icon: CpuChipIcon,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  {
    type: NodeType.Command,
    label: 'Command',
    description: 'Execute shell commands',
    icon: CommandLineIcon,
    color: 'text-green-400 bg-green-500/10 border-green-500/30',
  },
  {
    type: NodeType.SlashCommand,
    label: 'Slash Command',
    description: 'Run Claude Code slash commands',
    icon: BoltIcon,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  },
  {
    type: NodeType.Eval,
    label: 'Eval',
    description: 'Transform context with JavaScript',
    icon: CodeBracketIcon,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  {
    type: NodeType.Http,
    label: 'HTTP Request',
    description: 'Make HTTP/API calls',
    icon: GlobeAltIcon,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    type: NodeType.Llm,
    label: 'LLM',
    description: 'Direct LLM call (no agent loop)',
    icon: ChatBubbleLeftRightIcon,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  },
  {
    type: NodeType.DynamicAgent,
    label: 'Dynamic Agent',
    description: 'Agent with runtime configuration',
    icon: CogIcon,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  },
  {
    type: NodeType.DynamicCommand,
    label: 'Dynamic Command',
    description: 'Command with runtime configuration',
    icon: PlayCircleIcon,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
];

// ============================================================================
// Component
// ============================================================================

export function NodeLibrarySidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 h-full bg-bg-secondary border-r border-border-default overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4">
          Node Library
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          Drag nodes onto the canvas to build your workflow.
        </p>

        <div className="space-y-2">
          {nodeTypes.map((nodeType) => (
            <NodeTypeCard
              key={nodeType.type}
              nodeType={nodeType}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Node Type Card
// ============================================================================

interface NodeTypeCardProps {
  nodeType: NodeTypeInfo;
  onDragStart: (event: React.DragEvent, type: NodeType) => void;
}

function NodeTypeCard({ nodeType, onDragStart }: NodeTypeCardProps) {
  const Icon = nodeType.icon;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, nodeType.type)}
      className={`
        p-3 rounded-lg border cursor-grab active:cursor-grabbing
        transition-all duration-200 hover:scale-[1.02]
        ${nodeType.color}
        hover:shadow-md
      `}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">
            {nodeType.label}
          </div>
          <div className="text-xs text-text-secondary truncate">
            {nodeType.description}
          </div>
        </div>
      </div>
    </div>
  );
}
