/**
 * Canvas Context Menu
 *
 * Railway-inspired right-click context menu for the workflow canvas.
 * Features:
 * - Add node submenu with grouped categories
 * - View controls (fit, zoom)
 * - Clipboard operations
 * - Keyboard shortcut hints
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  PlusIcon,
  ClipboardDocumentIcon,
  ViewfinderCircleIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ChevronRightIcon,
  CpuChipIcon,
  CommandLineIcon,
  GlobeAltIcon,
  StopCircleIcon,
} from '@heroicons/react/24/outline';
import { NodeType } from '@/lib/graph/enums';
import { NODE_COLORS } from '@/lib/design-system';
import { useWorkflowBuilderStore } from '@/store';

// ============================================================================
// Types
// ============================================================================

interface NodeSection {
  title: string;
  types: NodeType[];
}

interface ContextMenuPosition {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

interface CanvasContextMenuProps {
  position: ContextMenuPosition;
  onClose: () => void;
}

// ============================================================================
// Node Sections
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
  {
    title: 'Control Flow',
    types: [NodeType.End],
  },
];

// ============================================================================
// Section Icons
// ============================================================================

const sectionIcons: Record<string, typeof CpuChipIcon> = {
  'AI Nodes': CpuChipIcon,
  'Utility Nodes': CommandLineIcon,
  'Integration Nodes': GlobeAltIcon,
  'Control Flow': StopCircleIcon,
};

// ============================================================================
// Component
// ============================================================================

export function CanvasContextMenu({ position, onClose }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = React.useState<string | null>(null);
  const { fitView, zoomIn, zoomOut, setViewport, getViewport } = useReactFlow();
  const { addNode, selectNode, nodes, setNodes } = useWorkflowBuilderStore();

  // Close on escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = React.useMemo(() => {
    const menuWidth = 200;
    const menuHeight = 320;
    const submenuWidth = 180;

    let x = position.x;
    let y = position.y;

    // Check right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8;
    }

    // Check bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8;
    }

    // Check if submenu would overflow
    const submenuOnLeft = x + menuWidth + submenuWidth > window.innerWidth;

    return { x, y, submenuOnLeft };
  }, [position]);

  // Handle adding a node
  const handleAddNode = useCallback((type: NodeType) => {
    const nodeId = addNode(type, { x: position.flowX, y: position.flowY });
    selectNode(nodeId);
    onClose();
  }, [addNode, selectNode, position.flowX, position.flowY, onClose]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const updatedNodes = nodes.map((node) => ({
      ...node,
      selected: true,
    }));
    setNodes(updatedNodes);
    onClose();
  }, [nodes, setNodes, onClose]);

  // Handle fit view
  const handleFitView = useCallback(() => {
    void fitView({ padding: 0.2, duration: 200 });
    onClose();
  }, [fitView, onClose]);

  // Handle zoom
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (direction === 'in') {
      void zoomIn({ duration: 150 });
    } else if (direction === 'out') {
      void zoomOut({ duration: 150 });
    } else {
      const viewport = getViewport();
      void setViewport({ ...viewport, zoom: 1 }, { duration: 150 });
    }
    onClose();
  }, [zoomIn, zoomOut, getViewport, setViewport, onClose]);

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-50
        min-w-[200px]
        bg-bg-secondary
        border border-border-default
        rounded-lg
        shadow-xl shadow-black/30
        py-1.5
        animate-in fade-in zoom-in-95
        duration-100
      `}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Add Node Submenu Trigger */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('add')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <MenuItem
          icon={<PlusIcon className="w-4 h-4" />}
          label="Add Node"
          shortcut="⌘N"
          hasSubmenu
        />

        {/* Add Node Submenu */}
        {activeSubmenu === 'add' && (
          <div
            className={`
              absolute top-0 ${adjustedPosition.submenuOnLeft ? 'right-full mr-1' : 'left-full ml-1'}
              min-w-[180px]
              bg-bg-secondary
              border border-border-default
              rounded-lg
              shadow-xl shadow-black/30
              py-1.5
              animate-in fade-in slide-in-from-left-1
              duration-100
            `}
          >
            {sections.map((section) => {
              const SectionIcon = sectionIcons[section.title] ?? PlusIcon;
              return (
                <div key={section.title}>
                  {/* Section header */}
                  <div className="px-3 py-1.5 flex items-center gap-2">
                    <SectionIcon className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                      {section.title}
                    </span>
                  </div>

                  {/* Node types */}
                  {section.types.map((type) => {
                    const config = NODE_COLORS[type];
                    if (config === undefined || config === null) return null;
                    const Icon = config.icon;

                    return (
                      <button
                        key={type}
                        onClick={() => handleAddNode(type)}
                        className={`
                          w-full px-3 py-1.5
                          flex items-center gap-2.5
                          text-left text-sm text-text-primary
                          hover:bg-bg-hover
                          transition-colors duration-75
                        `}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${config.bgColor}`}>
                          <Icon className={`w-3 h-3 ${config.textColor}`} />
                        </div>
                        <span className="text-xs">{config.label}</span>
                      </button>
                    );
                  })}

                  {/* Divider between sections */}
                  {section !== sections[sections.length - 1] && (
                    <div className="my-1.5 mx-2 h-px bg-border-subtle" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Divider />

      {/* Clipboard Operations */}
      <MenuItem
        icon={<ClipboardDocumentIcon className="w-4 h-4" />}
        label="Paste"
        shortcut="⌘V"
        disabled
      />
      <MenuItem
        icon={<ArrowsPointingOutIcon className="w-4 h-4" />}
        label="Select All"
        shortcut="⌘A"
        onClick={handleSelectAll}
      />

      <Divider />

      {/* View Controls */}
      <MenuItem
        icon={<ViewfinderCircleIcon className="w-4 h-4" />}
        label="Fit View"
        shortcut="⌘1"
        onClick={handleFitView}
      />
      <MenuItem
        icon={<MagnifyingGlassPlusIcon className="w-4 h-4" />}
        label="Zoom In"
        shortcut="⌘+"
        onClick={() => handleZoom('in')}
      />
      <MenuItem
        icon={<MagnifyingGlassMinusIcon className="w-4 h-4" />}
        label="Zoom Out"
        shortcut="⌘-"
        onClick={() => handleZoom('out')}
      />
      <MenuItem
        icon={<span className="w-4 h-4 flex items-center justify-center text-xs font-mono">1:1</span>}
        label="Zoom to 100%"
        shortcut="⌘0"
        onClick={() => handleZoom('reset')}
      />
    </div>
  );
}

// ============================================================================
// MenuItem Component
// ============================================================================

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  hasSubmenu?: boolean;
  disabled?: boolean;
}

function MenuItem({ icon, label, shortcut, onClick, hasSubmenu, disabled }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full px-3 py-1.5
        flex items-center gap-2.5
        text-left
        transition-colors duration-75
        ${disabled === true
          ? 'text-text-muted cursor-not-allowed'
          : 'text-text-primary hover:bg-bg-hover'
        }
      `}
    >
      <span className={disabled === true ? 'opacity-50' : ''}>{icon}</span>
      <span className="flex-1 text-xs">{label}</span>
      {shortcut !== undefined && shortcut !== '' && (
        <span className="text-[10px] text-text-tertiary font-mono">
          {shortcut}
        </span>
      )}
      {hasSubmenu === true && (
        <ChevronRightIcon className="w-3.5 h-3.5 text-text-tertiary" />
      )}
    </button>
  );
}

// ============================================================================
// Divider Component
// ============================================================================

function Divider() {
  return <div className="my-1.5 mx-2 h-px bg-border-subtle" />;
}
