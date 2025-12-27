'use client';

/**
 * Activity Log Entry Component
 *
 * Renders individual activity entries with specialized views for:
 * - Tool calls (expandable with input JSON)
 * - Tool results (success/failure with output)
 * - Text deltas (streaming content)
 * - Thinking blocks (collapsible reasoning)
 * - Errors (highlighted with copy functionality)
 */

import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  CommandLineIcon,
  DocumentTextIcon,
  LightBulbIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import type { AgentActivityEvent } from '@/lib/planning/types';

interface ActivityLogEntryProps {
  activity: AgentActivityEvent;
  isExpanded?: boolean;
  onToggle?: () => void;
}

/**
 * Format relative time for display
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  if (diff < 1000) return 'now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Get icon for activity type
 */
function getActivityIcon(activityType: AgentActivityEvent['activityType']) {
  switch (activityType) {
    case 'tool_start':
    case 'tool_result':
      return <CommandLineIcon className="w-4 h-4" />;
    case 'text_delta':
      return <DocumentTextIcon className="w-4 h-4" />;
    case 'thinking':
      return <LightBulbIcon className="w-4 h-4" />;
    case 'error':
      return <ExclamationCircleIcon className="w-4 h-4" />;
    default:
      return <DocumentTextIcon className="w-4 h-4" />;
  }
}

/**
 * Get display name for a tool
 */
function getToolDisplayName(toolName: string): string {
  const toolNames: Record<string, string> = {
    Read: 'Read File',
    Write: 'Write File',
    Edit: 'Edit File',
    Bash: 'Run Command',
    Glob: 'Search Files',
    Grep: 'Search Content',
    WebFetch: 'Fetch URL',
    WebSearch: 'Web Search',
  };
  return toolNames[toolName] ?? toolName;
}

export function ActivityLogEntry({
  activity,
  isExpanded = false,
  onToggle,
}: ActivityLogEntryProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tool Start Entry
  if (activity.activityType === 'tool_start') {
    const { toolName, toolInput, filePath } = activity.data;
    const displayName = getToolDisplayName(toolName ?? 'Tool');

    return (
      <div className="bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-hover transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0 w-6 h-6 rounded bg-accent-primary/10 flex items-center justify-center">
              <CommandLineIcon className="w-3.5 h-3.5 text-accent-primary" />
            </div>
            <span className="text-sm font-medium text-text-primary truncate">
              {displayName}
            </span>
            {filePath && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary truncate">
                <FolderIcon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{filePath}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-text-tertiary">
              {formatRelativeTime(activity.timestamp)}
            </span>
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
        </button>

        {isExpanded && toolInput && (
          <div className="px-3 py-2 border-t border-border-subtle bg-bg-tertiary">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-tertiary">Input</span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(toolInput, null, 2))}
                className="p-1 hover:bg-bg-hover rounded transition-colors"
                title="Copy input"
              >
                {copied ? (
                  <CheckIcon className="w-3.5 h-3.5 text-accent-success" />
                ) : (
                  <DocumentDuplicateIcon className="w-3.5 h-3.5 text-text-tertiary" />
                )}
              </button>
            </div>
            <pre className="text-xs font-mono text-text-secondary overflow-x-auto max-h-32 overflow-y-auto">
              {JSON.stringify(toolInput, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Tool Result Entry
  if (activity.activityType === 'tool_result') {
    const { success, toolOutput, errorMessage } = activity.data;

    return (
      <div
        className={`px-3 py-2 rounded-lg border ${
          success
            ? 'bg-accent-success/5 border-accent-success/20'
            : 'bg-accent-error/5 border-accent-error/20'
        }`}
      >
        <div className="flex items-center gap-2">
          {success ? (
            <CheckIcon className="w-4 h-4 text-accent-success flex-shrink-0" />
          ) : (
            <XMarkIcon className="w-4 h-4 text-accent-error flex-shrink-0" />
          )}
          <span
            className={`text-sm font-medium ${
              success ? 'text-accent-success' : 'text-accent-error'
            }`}
          >
            {success ? 'Success' : 'Failed'}
          </span>
          <span className="text-xs text-text-tertiary ml-auto">
            {formatRelativeTime(activity.timestamp)}
          </span>
        </div>
        {!success && errorMessage && (
          <p className="mt-1 text-xs text-accent-error/80 truncate">
            {errorMessage}
          </p>
        )}
        {success === true && typeof toolOutput === 'string' && toolOutput.length > 0 ? (
          <p className="mt-1 text-xs text-text-secondary line-clamp-2">
            {toolOutput.substring(0, 200)}
            {toolOutput.length > 200 ? '...' : ''}
          </p>
        ) : null}
      </div>
    );
  }

  // Text Delta Entry
  if (activity.activityType === 'text_delta') {
    const { textDelta } = activity.data;

    return (
      <div className="px-3 py-2 bg-bg-secondary/50 rounded-lg">
        <p className="text-sm text-text-primary whitespace-pre-wrap">
          {textDelta}
        </p>
      </div>
    );
  }

  // Thinking Entry
  if (activity.activityType === 'thinking') {
    const { thinkingContent } = activity.data;

    return (
      <div className="bg-amber-500/5 rounded-lg border border-amber-500/20 overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-amber-500/10 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <LightBulbIcon className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600">Thinking</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">
              {formatRelativeTime(activity.timestamp)}
            </span>
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
        </button>

        {isExpanded && thinkingContent && (
          <div className="px-3 py-2 border-t border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto">
              {thinkingContent}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Error Entry
  if (activity.activityType === 'error') {
    const { errorMessage, errorCode } = activity.data;

    return (
      <div className="px-3 py-2 bg-accent-error/10 border border-accent-error/30 rounded-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ExclamationCircleIcon className="w-4 h-4 text-accent-error flex-shrink-0" />
            <span className="text-sm font-medium text-accent-error">Error</span>
            {errorCode && (
              <span className="text-xs font-mono text-accent-error/70 bg-accent-error/10 px-1.5 py-0.5 rounded">
                {errorCode}
              </span>
            )}
          </div>
          <button
            onClick={() => copyToClipboard(errorMessage ?? 'Unknown error')}
            className="p-1 hover:bg-accent-error/20 rounded transition-colors flex-shrink-0"
            title="Copy error"
          >
            {copied ? (
              <CheckIcon className="w-3.5 h-3.5 text-accent-success" />
            ) : (
              <DocumentDuplicateIcon className="w-3.5 h-3.5 text-accent-error" />
            )}
          </button>
        </div>
        <p className="mt-2 text-sm text-text-primary whitespace-pre-wrap">
          {errorMessage ?? 'An unknown error occurred'}
        </p>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="px-3 py-2 bg-bg-secondary rounded-lg">
      <div className="flex items-center gap-2">
        {getActivityIcon(activity.activityType)}
        <span className="text-sm text-text-primary">
          {activity.activityType}
        </span>
        <span className="text-xs text-text-tertiary ml-auto">
          {formatRelativeTime(activity.timestamp)}
        </span>
      </div>
    </div>
  );
}
