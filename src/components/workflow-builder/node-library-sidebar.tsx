/**
 * Node Library Sidebar
 *
 * Collapsible sidebar with Railway-inspired styling.
 * Features:
 * - Section groupings (AI Nodes, Utility Nodes, Integration Nodes)
 * - Cards with neutral background and colored left border
 * - Smooth collapse/expand animation
 * - Floating toggle when collapsed
 */

'use client';

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { NodeType } from '@/lib/graph/enums';
import { NODE_COLORS, type NodeColorConfig } from '@/lib/design-system';
import { useWorkflowBuilderStore } from '@/store';

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
// Exports for Context Menu
// ============================================================================

export { sections };
export type { NodeSection };

// ============================================================================
// Component
// ============================================================================

export function NodeLibrarySidebar() {
  const { isLibraryCollapsed, toggleLibrary } = useWorkflowBuilderStore();

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="relative h-full flex-shrink-0 overflow-visible">
      {/* Main Sidebar */}
      <div
        className={`
          h-full
          bg-bg-secondary border-r border-border-default
          transition-all duration-200 ease-out
          ${isLibraryCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-64'}
        `}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Header with toggle */}
          <div className="px-3 py-2.5 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-bg-tertiary flex items-center justify-center">
                <Squares2X2Icon className="w-3.5 h-3.5 text-text-tertiary" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-text-primary leading-tight">Nodes</h2>
                <p className="text-[10px] text-text-tertiary leading-tight">Drag to canvas</p>
              </div>
            </div>
            <button
              onClick={toggleLibrary}
              className={`
                w-6 h-6 rounded-md
                flex items-center justify-center
                text-text-tertiary hover:text-text-secondary
                hover:bg-bg-hover
                transition-colors duration-150
              `}
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sections */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {sections.map((section) => (
              <div key={section.title}>
                {/* Section header */}
                <div className="px-1.5 mb-1.5">
                  <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                    {section.title}
                  </span>
                </div>

                {/* Node cards */}
                <div className="space-y-1">
                  {section.types.map((type) => {
                    const config = NODE_COLORS[type];
                    if (config === undefined || config === null) return null;

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
      </div>

      {/* Floating toggle button when collapsed - positioned relative to sidebar container */}
      {isLibraryCollapsed && (
        <button
          onClick={toggleLibrary}
          className={`
            absolute left-2 top-1/2 -translate-y-1/2 z-20
            w-8 h-8 rounded-lg
            bg-bg-secondary border border-border-default
            flex items-center justify-center
            text-text-tertiary hover:text-text-secondary
            hover:bg-bg-hover hover:border-border-hover
            shadow-lg shadow-black/20
            transition-all duration-150
          `}
          aria-label="Expand sidebar"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}
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
        group relative flex items-center gap-2.5
        p-2 rounded-lg
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
          w-7 h-7 rounded-md
          ${config.bgColor}
        `}
      >
        <Icon className={`w-3.5 h-3.5 ${config.textColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-text-primary truncate">
          {config.label}
        </div>
        <div className="text-[10px] text-text-tertiary truncate leading-tight">
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
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
