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
  CommandLineIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  PlayCircleIcon,
  ArrowDownTrayIcon,
  StopCircleIcon,
} from '@heroicons/react/24/outline';
import { ClaudeIcon, GitHubIcon } from '@/components/icons';
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
  [NodeType.Trigger]: {
    label: 'Trigger',
    description: 'Workflow entry point with inputs',
    icon: PlayCircleIcon,
    hex: '#10b981',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    accentBorder: 'border-l-emerald-500',
  },
  [NodeType.Agent]: {
    label: 'Agent',
    description: 'AI agent with tools and conversation',
    icon: ClaudeIcon,
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
    icon: ClaudeIcon,
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
    icon: GitHubIcon,
    hex: '#8b5cf6',
    textColor: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    accentBorder: 'border-l-violet-500',
  },
  [NodeType.GitCheckout]: {
    label: 'Git Checkout',
    description: 'Clone a GitHub repository',
    icon: ArrowDownTrayIcon,
    hex: '#14b8a6',
    textColor: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
    accentBorder: 'border-l-teal-500',
  },
  [NodeType.End]: {
    label: 'End',
    description: 'Workflow terminal with status transition',
    icon: StopCircleIcon,
    hex: '#10b981',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    accentBorder: 'border-l-emerald-500',
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
// Kanban/Project Status Colors
// =============================================================================

export interface KanbanStatusColorConfig {
  bg: string;
  text: string;
  border: string;
  glow: string;
}

const KANBAN_STATUS_COLORS: Record<string, KanbanStatusColorConfig> = {
  'todo': { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', glow: 'shadow-gray-500/20' },
  'backlog': { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', glow: 'shadow-gray-500/20' },
  'in progress': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/20' },
  'in review': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
  'review': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
  'done': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
  'closed': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
};

const DEFAULT_KANBAN_STATUS: KanbanStatusColorConfig = {
  bg: 'bg-blue-500/10',
  text: 'text-blue-400',
  border: 'border-blue-500/30',
  glow: 'shadow-blue-500/20',
};

/**
 * Get color configuration for a Kanban/GitHub Project status.
 * Status is normalized to lowercase for matching.
 */
export function getKanbanStatusColor(status: string): KanbanStatusColorConfig {
  const normalized = status.toLowerCase().trim();
  return KANBAN_STATUS_COLORS[normalized] ?? DEFAULT_KANBAN_STATUS;
}

// =============================================================================
// Date/Time Formatting (re-exported from utils)
// =============================================================================

export { formatRelativeTime } from '@/lib/utils/date';
