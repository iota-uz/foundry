/**
 * Node Type Color Configuration
 *
 * Single source of truth for all node type colors used throughout the application.
 * Centralizes color definitions to eliminate duplication across:
 * - Node library sidebar
 * - Canvas nodes
 * - MiniMap
 * - Execution panels
 */

import {
  CpuChipIcon,
  CommandLineIcon,
  BoltIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  PlayCircleIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { NodeType } from '@/lib/graph/enums';

// =============================================================================
// Types
// =============================================================================

export interface NodeColorConfig {
  /** Display name for the node type */
  label: string;
  /** Short description of the node type */
  description: string;
  /** Hero icon component */
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>;
  /** Hex color value for MiniMap and other direct color needs */
  hex: string;
  /** Tailwind text color class */
  textColor: string;
  /** Tailwind background color class (with opacity) */
  bgColor: string;
  /** Tailwind border color class (with opacity) */
  borderColor: string;
  /** Tailwind accent border color for left accent style */
  accentBorder: string;
}

// =============================================================================
// Node Color Definitions
// =============================================================================

export const NODE_COLORS: Record<NodeType, NodeColorConfig> = {
  [NodeType.Agent]: {
    label: 'Agent',
    description: 'AI agent with tools and conversation',
    icon: CpuChipIcon,
    hex: '#a855f7',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    accentBorder: 'border-l-purple-500',
  },
  [NodeType.Command]: {
    label: 'Command',
    description: 'Execute shell commands',
    icon: CommandLineIcon,
    hex: '#22c55e',
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    accentBorder: 'border-l-green-500',
  },
  [NodeType.SlashCommand]: {
    label: 'Slash Command',
    description: 'Run Claude Code slash commands',
    icon: BoltIcon,
    hex: '#eab308',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    accentBorder: 'border-l-yellow-500',
  },
  [NodeType.Eval]: {
    label: 'Eval',
    description: 'Transform context with JavaScript',
    icon: CodeBracketIcon,
    hex: '#3b82f6',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    accentBorder: 'border-l-blue-500',
  },
  [NodeType.Http]: {
    label: 'HTTP Request',
    description: 'Make HTTP/API calls',
    icon: GlobeAltIcon,
    hex: '#06b6d4',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    accentBorder: 'border-l-cyan-500',
  },
  [NodeType.Llm]: {
    label: 'LLM',
    description: 'Direct LLM call (no agent loop)',
    icon: ChatBubbleLeftRightIcon,
    hex: '#ec4899',
    textColor: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    accentBorder: 'border-l-pink-500',
  },
  [NodeType.DynamicAgent]: {
    label: 'Dynamic Agent',
    description: 'Agent with runtime configuration',
    icon: CogIcon,
    hex: '#f97316',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    accentBorder: 'border-l-orange-500',
  },
  [NodeType.DynamicCommand]: {
    label: 'Dynamic Command',
    description: 'Command with runtime configuration',
    icon: PlayCircleIcon,
    hex: '#ef4444',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    accentBorder: 'border-l-red-500',
  },
  [NodeType.GitHubProject]: {
    label: 'GitHub Project',
    description: 'Update GitHub Project status',
    icon: FolderIcon,
    hex: '#8b5cf6',
    textColor: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    accentBorder: 'border-l-violet-500',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get color configuration for a node type.
 * Falls back to Command node colors if type is not found.
 */
export function getNodeColor(nodeType: NodeType): NodeColorConfig {
  return NODE_COLORS[nodeType] ?? NODE_COLORS[NodeType.Command];
}

/**
 * Get hex color for MiniMap node rendering.
 */
export function getNodeHexColor(nodeType: NodeType): string {
  return getNodeColor(nodeType).hex;
}

// =============================================================================
// Execution Status Colors
// =============================================================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface StatusColorConfig {
  textColor: string;
  bgColor: string;
  borderColor: string;
  dotClass: string;
}

export const STATUS_COLORS: Record<ExecutionStatus, StatusColorConfig> = {
  pending: {
    textColor: 'text-text-tertiary',
    bgColor: 'bg-text-tertiary/10',
    borderColor: 'border-text-tertiary/30',
    dotClass: 'status-dot-pending',
  },
  running: {
    textColor: 'text-accent-warning',
    bgColor: 'bg-accent-warning/10',
    borderColor: 'border-accent-warning/30',
    dotClass: 'status-dot-running',
  },
  completed: {
    textColor: 'text-accent-success',
    bgColor: 'bg-accent-success/10',
    borderColor: 'border-accent-success/30',
    dotClass: 'status-dot-completed',
  },
  failed: {
    textColor: 'text-accent-error',
    bgColor: 'bg-accent-error/10',
    borderColor: 'border-accent-error/30',
    dotClass: 'status-dot-failed',
  },
  paused: {
    textColor: 'text-accent-warning',
    bgColor: 'bg-accent-warning/10',
    borderColor: 'border-accent-warning/30',
    dotClass: 'status-dot-paused',
  },
};

export function getStatusColor(status: ExecutionStatus): StatusColorConfig {
  return STATUS_COLORS[status] ?? STATUS_COLORS.pending;
}

// =============================================================================
// Date/Time Formatting
// =============================================================================

/**
 * Format a date as relative time (e.g., "2m ago", "3h ago").
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
