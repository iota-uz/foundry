/**
 * Project Kanban Board Page
 *
 * Full-height Kanban board synced with GitHub Projects V2.
 * Features:
 * - Drag-and-drop issue management
 * - Repository filtering
 * - Manual sync with GitHub
 * - Industrial command-center aesthetic
 */

'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExclamationCircleIcon, BoltIcon } from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/layout';
import { KanbanBoard, RepoFilter, SyncButton, IssueDetailPanel } from '@/components/projects';
import { useKanbanStore } from '@/store/kanban.store';

// ============================================================================
// Loading Skeleton
// ============================================================================

function BoardSkeleton() {
  return (
    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[320px] h-full bg-bg-primary/50 border border-border-subtle rounded-xl animate-pulse"
        >
          {/* Header skeleton */}
          <div className="p-3 border-b border-border-subtle">
            <div className="h-3 w-16 bg-bg-tertiary rounded mb-2" />
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-bg-tertiary rounded" />
              <div className="h-5 w-8 bg-bg-tertiary rounded-full" />
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="p-2 space-y-2">
            {[1, 2, 3].slice(0, Math.floor(Math.random() * 3) + 1).map((j) => (
              <div
                key={j}
                className="p-3 bg-bg-secondary border border-border-default rounded-lg"
              >
                <div className="flex justify-between mb-2">
                  <div className="h-3 w-10 bg-bg-tertiary rounded" />
                  <div className="h-3 w-20 bg-bg-tertiary rounded" />
                </div>
                <div className="h-4 w-full bg-bg-tertiary rounded mb-2" />
                <div className="h-4 w-3/4 bg-bg-tertiary rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProjectBoardPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const {
    projectName,
    lastSyncedAt,
    availableRepos,
    selectedRepos,
    selectedIssueId,
    issues,
    isLoading,
    isSyncing,
    error,
    fetchBoard,
    syncBoard,
    setRepoFilter,
    setSelectedIssue,
    clearError,
  } = useKanbanStore();

  // Get the selected issue
  const selectedIssue = useMemo(() => {
    if (!selectedIssueId) return null;
    return issues.find((i) => i.id === selectedIssueId) || null;
  }, [selectedIssueId, issues]);

  // Fetch board data on mount
  useEffect(() => {
    if (projectId) {
      fetchBoard(projectId);
    }
  }, [projectId, fetchBoard]);

  const handleSync = () => {
    if (projectId) {
      syncBoard(projectId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: projectName || 'Loading...' },
        ]}
      />

      {/* Header Bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border-subtle bg-bg-secondary/50">
        <div className="flex items-center justify-between">
          {/* Left side: Title and terminal prompt */}
          <div className="flex items-center gap-4">
            <div>
              {/* Terminal prompt */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-text-tertiary mb-0.5">
                <span className="text-emerald-400">$</span>
                <span>foundry</span>
                <span className="text-text-muted">board</span>
                <span className="text-emerald-400">--project</span>
                <span className="text-text-secondary truncate max-w-[200px]">
                  {projectId?.slice(0, 8)}...
                </span>
              </div>

              {/* Project name */}
              <h1 className="text-lg font-semibold text-text-primary">
                {projectName || 'Project Board'}
              </h1>
            </div>
          </div>

          {/* Right side: Filters, automations, and sync */}
          <div className="flex items-center gap-3">
            {/* Repo filter */}
            {availableRepos.length > 0 && (
              <RepoFilter
                availableRepos={availableRepos}
                selectedRepos={selectedRepos}
                onSelectionChange={setRepoFilter}
              />
            )}

            {/* Automations link */}
            <Link
              href={`/projects/${projectId}/automations`}
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border-default hover:border-border-hover transition-all duration-150"
            >
              <BoltIcon className="w-4 h-4" />
              <span>Automations</span>
            </Link>

            {/* Sync button */}
            <SyncButton
              lastSyncedAt={lastSyncedAt}
              isSyncing={isSyncing}
              onSync={handleSync}
            />
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-4 p-4 rounded-lg bg-accent-error/10 border border-accent-error/30 flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-accent-error font-medium">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-accent-error hover:text-accent-error/80 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Board content */}
      {isLoading ? (
        <BoardSkeleton />
      ) : (
        <KanbanBoard />
      )}

      {/* Status bar */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-border-subtle bg-bg-secondary/30">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary">
          <div className="flex items-center gap-4">
            <span>
              <span className="text-text-muted">status:</span>{' '}
              <span className={isSyncing ? 'text-yellow-400' : 'text-emerald-400'}>
                {isSyncing ? 'syncing' : 'ready'}
              </span>
            </span>
            {selectedRepos.length > 0 && (
              <span>
                <span className="text-text-muted">filter:</span>{' '}
                <span className="text-purple-400">{selectedRepos.length} repos</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>
              <span className="text-text-muted">drag:</span>{' '}
              <span className="text-text-secondary">enabled</span>
            </span>
            <span>
              <span className="text-text-muted">mode:</span>{' '}
              <span className="text-emerald-400">kanban</span>
            </span>
          </div>
        </div>
      </div>

      {/* Issue Detail Panel */}
      <IssueDetailPanel
        issue={selectedIssue}
        projectId={projectId}
        isOpen={selectedIssueId !== null}
        onClose={() => setSelectedIssue(null)}
      />
    </div>
  );
}
