/**
 * Issue Detail Panel Component
 *
 * Slide-over panel displaying comprehensive issue information.
 * Features:
 * - GitHub issue metadata
 * - Markdown body rendering
 * - Execution history timeline
 * - Manual automation triggers
 * - Industrial command-center aesthetic
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  UserCircleIcon,
  TagIcon,
  BoltIcon,
  PlayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ExecutionTimeline, type ExecutionEntry } from './execution-timeline';
import { PlanButton } from './plan-button';
import { formatDate, formatRelativeTime } from '@/lib/utils/date';
import { getKanbanStatusColor } from '@/lib/design-system';
import { Markdown } from '@/components/shared';
import type { KanbanIssue } from '@/store/kanban.store';

// ============================================================================
// Types
// ============================================================================

interface IssueDetailPanelProps {
  issue: KanbanIssue | null;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  availableStatuses?: string[];
}

interface Automation {
  id: string;
  triggerType: 'status_enter' | 'manual';
  buttonLabel: string | null;
  enabled: boolean;
}

// ============================================================================
// Manual Trigger Button
// ============================================================================

function ManualTriggerButton({
  automation,
  projectId,
  issueId,
  onTrigger,
}: {
  automation: Automation;
  projectId: string;
  issueId: string;
  onTrigger: () => void;
}) {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTrigger = async () => {
    setIsTriggering(true);
    try {
      await fetch(`/api/projects/${projectId}/issues/${issueId}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId: automation.id }),
      });
      onTrigger();
    } catch (error) {
      console.error('Failed to trigger automation:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={isTriggering || !automation.enabled}
      className={`
        inline-flex items-center gap-2
        px-3 py-2 rounded-lg
        text-sm font-medium
        transition-all duration-200
        ${automation.enabled
          ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50'
          : 'bg-bg-tertiary border border-border-subtle text-text-muted cursor-not-allowed'
        }
        disabled:opacity-50
      `}
    >
      {isTriggering ? (
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
      ) : (
        <PlayIcon className="w-4 h-4" />
      )}
      {automation.buttonLabel ?? 'Run Workflow'}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function IssueDetailPanel({
  issue,
  projectId,
  isOpen,
  onClose,
}: IssueDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'executions'>('details');
  const [executions, setExecutions] = useState<ExecutionEntry[]>([]);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);
  const [manualAutomations, setManualAutomations] = useState<Automation[]>([]);

  // Fetch executions when issue changes
  const fetchExecutions = useCallback(async () => {
    if (issue === null || issue === undefined || projectId === undefined || projectId === '') return;

    setIsLoadingExecutions(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issue.id}/executions`
      );
      if (response.ok) {
        const data: { data?: ExecutionEntry[] } = await response.json() as { data?: ExecutionEntry[] };
        setExecutions(data.data !== undefined ? data.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setIsLoadingExecutions(false);
    }
  }, [issue, projectId]);

  // Fetch manual automations
  const fetchManualAutomations = useCallback(async () => {
    if (projectId === undefined || projectId === '') return;

    try {
      const response = await fetch(`/api/projects/${projectId}/automations`);
      if (response.ok) {
        const data: { data?: Automation[] } = await response.json() as { data?: Automation[] };
        const manuals = (data.data !== undefined ? data.data : []).filter(
          (a: Automation) => a.triggerType === 'manual'
        );
        setManualAutomations(manuals);
      }
    } catch (error) {
      console.error('Failed to fetch automations:', error);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && issue !== null && issue !== undefined) {
      void fetchExecutions();
      void fetchManualAutomations();
    }
  }, [isOpen, issue, fetchExecutions, fetchManualAutomations]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !issue) return null;

  const statusColors = getKanbanStatusColor(issue.status);
  const githubUrl = `https://github.com/${issue.owner}/${issue.repo}/issues/${issue.number}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      {/* Panel */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 z-50
          w-full max-w-[520px]
          bg-bg-primary border-l border-border-default
          shadow-2xl shadow-black/50
          flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border-subtle">
          {/* Top bar with close button */}
          <div className="flex items-center justify-between px-5 py-3 bg-bg-secondary/50">
            <div className="flex items-center gap-3">
              {/* Issue number */}
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span className="text-lg font-mono font-bold">#{issue.number}</span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>

              {/* Repo badge */}
              <div className="px-2 py-0.5 rounded bg-bg-tertiary border border-border-subtle">
                <span className="text-xs font-mono text-text-tertiary">
                  {issue.owner}/{issue.repo}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Title */}
          <div className="px-5 py-4">
            <h2 className="text-lg font-semibold text-text-primary leading-tight">
              {issue.title}
            </h2>
          </div>

          {/* Status and metadata bar */}
          <div className="px-5 pb-4 flex flex-wrap items-center gap-3">
            {/* Status badge */}
            <div
              className={`
                inline-flex items-center gap-1.5
                px-2.5 py-1 rounded-lg
                ${statusColors.bg} ${statusColors.border} border
              `}
            >
              <div className={`w-2 h-2 rounded-full ${statusColors.text.replace('text-', 'bg-')}`} />
              <span className={`text-xs font-medium ${statusColors.text}`}>
                {issue.status}
              </span>
            </div>

            {/* Labels */}
            {issue.labels.length > 0 && (
              <div className="flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-text-muted" />
                <div className="flex flex-wrap gap-1">
                  {issue.labels.map((label) => (
                    <span
                      key={label.name}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `#${label.color}20`,
                        color: `#${label.color}`,
                        border: `1px solid #${label.color}40`,
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tab navigation */}
          <div className="px-5 flex gap-1 border-t border-border-subtle/50">
            <button
              onClick={() => setActiveTab('details')}
              className={`
                px-4 py-2.5 text-sm font-medium
                border-b-2 -mb-px transition-colors
                ${activeTab === 'details'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('executions')}
              className={`
                px-4 py-2.5 text-sm font-medium
                border-b-2 -mb-px transition-colors
                flex items-center gap-2
                ${activeTab === 'executions'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              Executions
              {executions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-bg-tertiary text-[10px] font-mono">
                  {executions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="p-5 space-y-6">
              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Created */}
                <div className="p-3 rounded-lg bg-bg-secondary/50 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <ClockIcon className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-[10px] font-mono text-text-tertiary uppercase">Created</span>
                  </div>
                  <div className="text-sm text-text-primary" title={formatDate(issue.createdAt)}>
                    {formatRelativeTime(issue.createdAt)}
                  </div>
                </div>

                {/* Updated */}
                <div className="p-3 rounded-lg bg-bg-secondary/50 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <ClockIcon className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-[10px] font-mono text-text-tertiary uppercase">Updated</span>
                  </div>
                  <div className="text-sm text-text-primary" title={formatDate(issue.updatedAt)}>
                    {formatRelativeTime(issue.updatedAt)}
                  </div>
                </div>
              </div>

              {/* Assignees */}
              {issue.assignees.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <UserCircleIcon className="w-4 h-4 text-text-muted" />
                    <span className="text-xs font-mono text-text-tertiary uppercase">Assignees</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {issue.assignees.map((assignee) => (
                      <a
                        key={assignee}
                        href={`https://github.com/${assignee}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-subtle hover:border-border-hover transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-text-primary uppercase">
                          {assignee.charAt(0)}
                        </div>
                        <span className="text-sm text-text-secondary">{assignee}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Body */}
              {issue.body !== undefined && issue.body !== null && issue.body !== '' && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
                      Description
                    </span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="p-4 rounded-lg bg-bg-secondary/30 border border-border-subtle">
                    <Markdown>{issue.body}</Markdown>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BoltIcon className="w-4 h-4 text-text-muted" />
                  <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
                    Quick Actions
                  </span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <PlanButton
                    projectId={projectId}
                    issueId={issue.id}
                    planStatus={issue.planStatus}
                  />
                  {manualAutomations.map((automation) => (
                    <ManualTriggerButton
                      key={automation.id}
                      automation={automation}
                      projectId={projectId}
                      issueId={issue.id}
                      onTrigger={fetchExecutions}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <ExecutionTimeline
                executions={executions}
                isLoading={isLoadingExecutions}
              />
            </div>
          )}
        </div>

        {/* Footer status bar */}
        <div className="flex-shrink-0 px-5 py-2 border-t border-border-subtle bg-bg-secondary/30">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary">
            <div className="flex items-center gap-3">
              <span>
                <span className="text-text-muted">id:</span>{' '}
                <span className="text-text-secondary">{issue.id.slice(0, 8)}</span>
              </span>
              <span>
                <span className="text-text-muted">gh:</span>{' '}
                <span className="text-emerald-400">{issue.githubIssueId.slice(0, 8)}</span>
              </span>
            </div>
            <span className="text-text-muted">
              press <kbd className="px-1 py-0.5 rounded bg-bg-tertiary text-text-tertiary">esc</kbd> to close
            </span>
          </div>
        </div>

        {/* Circuit pattern decoration */}
        <div
          className="absolute bottom-12 right-4 w-24 h-24 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgb(16, 185, 129) 1px, transparent 1px)
            `,
            backgroundSize: '12px 12px',
          }}
        />
      </div>
    </>
  );
}
