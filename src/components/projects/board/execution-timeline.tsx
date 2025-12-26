/**
 * Execution Timeline Component
 *
 * Displays automation execution history with circuit-board aesthetic.
 * Features:
 * - Vertical timeline with glowing nodes
 * - Circuit-board connector lines
 * - Color-coded result indicators
 * - Expandable error details
 * - Relative timestamps
 */

'use client';

import React, { useState } from 'react';
import {
  BoltIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { formatRelativeTime, formatDurationBetween } from '@/lib/utils/date';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionEntry {
  id: string;
  issueMetadataId: string;
  automationId: string;
  workflowExecutionId: string | null;
  triggeredBy: 'status_enter' | 'manual';
  triggerStatus: string | null;
  fromStatus: string | null;
  result: 'success' | 'failure' | 'cancelled' | null;
  nextStatusApplied: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface ExecutionTimelineProps {
  executions: ExecutionEntry[];
  isLoading?: boolean;
}

// ============================================================================
// Timeline Node Component
// ============================================================================

function TimelineNode({ execution, isLast }: { execution: ExecutionEntry; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSuccess = execution.result === 'success';
  const isFailure = execution.result === 'failure';
  const isPending = execution.result === null && (execution.completedAt === undefined || execution.completedAt === null);
  const isStatusTrigger = execution.triggeredBy === 'status_enter';

  // Color schemes based on result
  const colors = {
    node: isSuccess
      ? 'bg-emerald-500 shadow-emerald-500/50'
      : isFailure
      ? 'bg-red-500 shadow-red-500/50'
      : isPending
      ? 'bg-yellow-500 shadow-yellow-500/50 animate-pulse'
      : 'bg-gray-500 shadow-gray-500/50',
    ring: isSuccess
      ? 'ring-emerald-500/30'
      : isFailure
      ? 'ring-red-500/30'
      : isPending
      ? 'ring-yellow-500/30'
      : 'ring-gray-500/30',
    text: isSuccess
      ? 'text-emerald-400'
      : isFailure
      ? 'text-red-400'
      : isPending
      ? 'text-yellow-400'
      : 'text-gray-400',
    bg: isSuccess
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : isFailure
      ? 'bg-red-500/10 border-red-500/30'
      : isPending
      ? 'bg-yellow-500/10 border-yellow-500/30'
      : 'bg-gray-500/10 border-gray-500/30',
  };

  return (
    <div className="relative flex gap-4">
      {/* Vertical connector line */}
      {!isLast && (
        <div
          className="absolute left-[15px] top-8 w-px h-[calc(100%-16px)]"
          style={{
            background: `linear-gradient(180deg,
              ${isSuccess ? 'rgba(16, 185, 129, 0.5)' : isFailure ? 'rgba(239, 68, 68, 0.5)' : 'rgba(107, 114, 128, 0.3)'} 0%,
              rgba(107, 114, 128, 0.1) 100%
            )`,
          }}
        />
      )}

      {/* Circuit node */}
      <div className="relative flex-shrink-0 pt-1">
        <div
          className={`
            w-8 h-8 rounded-lg
            flex items-center justify-center
            ${colors.bg} border
            ring-2 ${colors.ring}
          `}
        >
          {isPending ? (
            <ClockIcon className={`w-4 h-4 ${colors.text}`} />
          ) : isSuccess ? (
            <CheckCircleIcon className={`w-4 h-4 ${colors.text}`} />
          ) : isFailure ? (
            <XCircleIcon className={`w-4 h-4 ${colors.text}`} />
          ) : (
            <ExclamationTriangleIcon className={`w-4 h-4 ${colors.text}`} />
          )}
        </div>

        {/* Glowing core */}
        <div
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-2 h-2 rounded-full
            ${colors.node}
            shadow-lg
          `}
          style={{ marginTop: '4px' }}
        />
      </div>

      {/* Execution details */}
      <div className="flex-1 pb-6">
        <div className="bg-bg-secondary/50 border border-border-subtle rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border-subtle/50">
            <div className="flex items-center justify-between mb-2">
              {/* Trigger type indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`
                    p-1 rounded
                    ${isStatusTrigger
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-purple-500/10 text-purple-400'
                    }
                  `}
                >
                  {isStatusTrigger ? (
                    <BoltIcon className="w-3.5 h-3.5" />
                  ) : (
                    <PlayIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-xs font-mono text-text-tertiary uppercase">
                  {isStatusTrigger ? 'status trigger' : 'manual trigger'}
                </span>
              </div>

              {/* Timestamp */}
              <span className="text-[10px] font-mono text-text-muted">
                {formatRelativeTime(execution.startedAt)}
              </span>
            </div>

            {/* Status flow */}
            {((execution.fromStatus !== undefined && execution.fromStatus !== '') || (execution.nextStatusApplied !== undefined && execution.nextStatusApplied !== '')) && (
              <div className="flex items-center gap-2 text-xs">
                {execution.fromStatus !== undefined && execution.fromStatus !== '' && (
                  <span className="px-2 py-0.5 rounded bg-bg-tertiary border border-border-subtle font-mono text-text-secondary">
                    {execution.fromStatus}
                  </span>
                )}
                {execution.fromStatus !== undefined && execution.fromStatus !== '' && execution.nextStatusApplied !== undefined && execution.nextStatusApplied !== '' && (
                  <ArrowRightIcon className="w-3 h-3 text-text-muted" />
                )}
                {execution.nextStatusApplied !== undefined && execution.nextStatusApplied !== '' && (
                  <span className={`px-2 py-0.5 rounded font-mono ${colors.bg} border ${colors.text}`}>
                    {execution.nextStatusApplied}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Result and duration */}
          <div className="px-3 py-2 flex items-center justify-between bg-bg-tertiary/30">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-medium ${colors.text}`}>
                {execution.result ?? 'pending'}
              </span>
              {execution.completedAt !== undefined && execution.completedAt !== null && (
                <>
                  <span className="text-text-muted">·</span>
                  <span className="text-[10px] font-mono text-text-tertiary">
                    {formatDurationBetween(execution.startedAt, execution.completedAt)}
                  </span>
                </>
              )}
            </div>

            {/* Expand button for errors */}
            {execution.errorMessage !== undefined && execution.errorMessage !== null && execution.errorMessage !== '' && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[10px] font-mono text-red-400 hover:text-red-300 transition-colors"
              >
                <span>error details</span>
                <ChevronDownIcon
                  className={`w-3 h-3 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}
          </div>

          {/* Expandable error message */}
          {isExpanded && execution.errorMessage !== undefined && execution.errorMessage !== null && execution.errorMessage !== '' && (
            <div className="p-3 bg-red-500/5 border-t border-red-500/20">
              <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-words">
                {execution.errorMessage}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-bg-tertiary" />
          <div className="flex-1">
            <div className="h-20 rounded-lg bg-bg-secondary/50 border border-border-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-xl bg-bg-tertiary border border-border-subtle flex items-center justify-center">
          <ClockIcon className="w-6 h-6 text-text-muted" />
        </div>
        {/* Decorative circuit nodes */}
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500/30" />
        <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-purple-500/30" />
      </div>

      <p className="text-sm text-text-tertiary text-center">
        No automation executions yet
      </p>
      <p className="text-xs text-text-muted text-center mt-1">
        Executions will appear here when workflows run
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ExecutionTimeline({ executions, isLoading = false }: ExecutionTimelineProps) {
  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (executions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
          <span className="text-emerald-400">$</span>
          <span>execution_log</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-border-subtle to-transparent" />
        <span className="text-[10px] font-mono text-text-muted">
          {executions.length} {executions.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {executions.map((execution, index) => (
          <TimelineNode
            key={execution.id}
            execution={execution}
            isLast={index === executions.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
