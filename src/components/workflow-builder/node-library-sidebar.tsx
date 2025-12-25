/**
 * Node Library Sidebar
 *
 * Production-grade node library with Linear/Vercel-inspired styling.
 * Features:
 * - Section groupings (AI Nodes, Utility Nodes, Integration Nodes)
 * - Cards with neutral background and colored left border
 * - Colored icon container
 * - Smooth drag interaction
 */

'use client';

import React from 'react';
import { NodeType } from '@/lib/graph/enums';
import { NODE_COLORS, type NodeColorConfig } from '@/lib/design-system';

// ============================================================================
// Types
// ============================================================================

interface NodeSection {
  title: string;
  types: NodeType[];
}

// ============================================================================
// Section Definitions
// ============================================================================

const sections: NodeSection[] = [
  {
    title: 'AI Nodes',
    types: [NodeType.Agent, NodeType.Llm, NodeType.DynamicAgent],
  },
  {
    title: 'Utility Nodes',
    types: [NodeType.Command, NodeType.SlashCommand, NodeType.Eval, NodeType.DynamicCommand],
  },
  {
    title: 'Integration Nodes',
    types: [NodeType.Http, NodeType.GitHubProject],
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
    <div
      className={`
        w-64 h-full
        bg-bg-secondary border-r border-border-default
        overflow-y-auto
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-text-primary">Node Library</h2>
        <p className="text-xs text-text-tertiary mt-1">
          Drag nodes to the canvas
        </p>
      </div>

      {/* Sections */}
      <div className="p-3 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            <div className="px-1 mb-2">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                {section.title}
              </span>
            </div>

            {/* Node cards */}
            <div className="space-y-1.5">
              {section.types.map((type) => {
                const config = NODE_COLORS[type];
                if (!config) return null;

                return (
                  <NodeTypeCard
                    key={type}
                    nodeType={type}
                    config={config}
                    onDragStart={onDragStart}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Node Type Card
// ============================================================================

interface NodeTypeCardProps {
  nodeType: NodeType;
  config: NodeColorConfig;
  onDragStart: (event: React.DragEvent, type: NodeType) => void;
}

function NodeTypeCard({ nodeType, config, onDragStart }: NodeTypeCardProps) {
  const Icon = config.icon;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, nodeType)}
      className={`
        group relative flex items-center gap-3
        p-2.5 rounded-lg
        bg-bg-tertiary hover:bg-bg-hover
        border border-border-subtle hover:border-border-default
        ${config.accentBorder} border-l-2
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        hover:shadow-sm
      `}
    >
      {/* Icon container */}
      <div
        className={`
          flex items-center justify-center
          w-8 h-8 rounded-md
          ${config.bgColor}
        `}
      >
        <Icon className={`w-4 h-4 ${config.textColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">
          {config.label}
        </div>
        <div className="text-xs text-text-tertiary truncate">
          {config.description}
        </div>
      </div>

      {/* Drag indicator */}
      <div
        className={`
          opacity-0 group-hover:opacity-100
          text-text-tertiary
          transition-opacity duration-150
        `}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
    </div>
  );
}
