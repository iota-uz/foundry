/**
 * Project Page
 *
 * Tabbed view with Kanban board and Workflows.
 * Features:
 * - Board tab: Drag-and-drop Kanban synced with GitHub Projects V2
 * - Workflows tab: List and manage project workflows
 * - Repository filtering
 * - Manual sync with GitHub
 */

'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ExclamationCircleIcon,
  BoltIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/layout';
import { KanbanBoard, RepoFilter, SyncButton, IssueDetailPanel } from '@/components/projects';
import { Button, EmptyState } from '@/components/shared';
import { useKanbanStore } from '@/store/kanban.store';
import { formatRelativeTime } from '@/lib/design-system';

// ============================================================================
// Types
// ============================================================================

type TabType = 'board' | 'workflows';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

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
          <div className="p-3 border-b border-border-subtle">
            <div className="h-3 w-16 bg-bg-tertiary rounded mb-2" />
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-bg-tertiary rounded" />
              <div className="h-5 w-8 bg-bg-tertiary rounded-full" />
            </div>
          </div>
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

function WorkflowsSkeleton() {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 bg-bg-secondary border border-border-default rounded-lg animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-5 w-48 bg-bg-tertiary rounded mb-2" />
                  <div className="h-4 w-64 bg-bg-tertiary rounded" />
                </div>
                <div className="h-4 w-20 bg-bg-tertiary rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Workflows Tab Content
// ============================================================================

interface WorkflowsTabProps {
  projectId: string;
}

function WorkflowsTab({ projectId }: WorkflowsTabProps) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/workflows`);
      if (!response.ok) {
        throw new Error('Failed to load workflows');
      }
      const data = await response.json() as { workflows: Workflow[] };
      setWorkflows(data.workflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  const handleDelete = async (workflow: Workflow) => {
    if (!confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/workflows/${workflow.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }
      setWorkflows((prev) => prev.filter((w) => w.id !== workflow.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete workflow');
    }
  };

  if (isLoading) {
    return <WorkflowsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <ExclamationCircleIcon className="w-12 h-12 text-accent-error mx-auto mb-4" />
          <p className="text-text-primary font-medium mb-1">Failed to load workflows</p>
          <p className="text-sm text-text-tertiary mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchWorkflows}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <EmptyState
          icon={<RectangleStackIcon className="w-12 h-12" />}
          title="No workflows yet"
          description="Create your first workflow to automate tasks for this project"
          action={{
            label: 'Create Workflow',
            onClick: () => router.push(`/projects/${projectId}/workflows/new`),
          }}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-text-tertiary">
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="primary"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => router.push(`/projects/${projectId}/workflows/new`)}
          >
            New Workflow
          </Button>
        </div>

        {/* Workflow list */}
        <div className="grid gap-4">
          {workflows.map((workflow) => {
            const nodeCount = (workflow.nodes as unknown[]).length;
            const updatedAt = formatRelativeTime(new Date(workflow.updatedAt));

            return (
              <div
                key={workflow.id}
                className="group relative p-4 bg-bg-secondary border border-border-default rounded-lg hover:border-accent-primary/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <Link
                    href={`/projects/${projectId}/workflows/${workflow.id}`}
                    className="flex-1"
                  >
                    <h3 className="font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                      {workflow.name}
                    </h3>
                    {workflow.description ? (
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                        {workflow.description}
                      </p>
                    ) : (
                      <p className="text-sm text-text-tertiary italic mt-1">
                        No description
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
                      <span className="px-2 py-0.5 rounded-full bg-bg-tertiary">
                        {nodeCount} node{nodeCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {updatedAt}
                      </span>
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/projects/${projectId}/workflows/${workflow.id}`}
                      className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
                      title="Edit workflow"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(workflow)}
                      className="p-2 rounded-lg text-text-tertiary hover:text-accent-error hover:bg-accent-error/10 transition-colors"
                      title="Delete workflow"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params?.id as string;

  // Tab state from URL
  const tabParam = searchParams?.get('tab');
  const activeTab: TabType = tabParam === 'workflows' ? 'workflows' : 'board';

  const setActiveTab = (tab: TabType) => {
    const url = new URL(window.location.href);
    if (tab === 'board') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    router.push(url.pathname + url.search);
  };

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

  const selectedIssue = useMemo(() => {
    if (selectedIssueId == null || selectedIssueId === '') return null;
    return issues.find((i) => i.id === selectedIssueId) || null;
  }, [selectedIssueId, issues]);

  useEffect(() => {
    if (projectId != null && projectId !== '') {
      void fetchBoard(projectId);
    }
  }, [projectId, fetchBoard]);

  const handleSync = () => {
    if (projectId != null && projectId !== '') {
      void syncBoard(projectId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/' },
          { label: projectName || 'Loading...' },
        ]}
      />

      {/* Header Bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border-subtle bg-bg-secondary/50">
        <div className="flex items-center justify-between">
          {/* Left side: Title and terminal prompt */}
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-text-tertiary mb-0.5">
                <span className="text-emerald-400">$</span>
                <span>foundry</span>
                <span className="text-text-muted">{activeTab === 'board' ? 'board' : 'workflows'}</span>
                <span className="text-emerald-400">--project</span>
                <span className="text-text-secondary truncate max-w-[200px]">
                  {projectId?.slice(0, 8)}...
                </span>
              </div>
              <h1 className="text-lg font-semibold text-text-primary">
                {projectName || 'Project'}
              </h1>
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-3">
            {/* Repo filter (only on board tab) */}
            {activeTab === 'board' && availableRepos.length > 0 && (
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
              <span className="hidden sm:inline">Automations</span>
            </Link>

            {/* Settings link */}
            <Link
              href={`/projects/${projectId}/settings`}
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border-default hover:border-border-hover transition-all duration-150"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {/* Sync button (only on board tab) */}
            {activeTab === 'board' && (
              <SyncButton
                lastSyncedAt={lastSyncedAt}
                isSyncing={isSyncing}
                onSync={handleSync}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex-shrink-0 px-4 border-b border-border-subtle bg-bg-primary">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('board')}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium
              border-b-2 -mb-px transition-colors
              ${activeTab === 'board'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }
            `}
          >
            <Squares2X2Icon className="w-4 h-4" />
            Board
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium
              border-b-2 -mb-px transition-colors
              ${activeTab === 'workflows'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }
            `}
          >
            <RectangleStackIcon className="w-4 h-4" />
            Workflows
          </button>
        </div>
      </div>

      {/* Error banner */}
      {activeTab === 'board' && (error != null && error !== '') && (
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

      {/* Tab Content */}
      {activeTab === 'board' ? (
        <>
          {isLoading ? <BoardSkeleton /> : <KanbanBoard />}

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
        </>
      ) : (
        <WorkflowsTab projectId={projectId} />
      )}

      {/* Issue Detail Panel (only for board) */}
      {activeTab === 'board' && (
        <IssueDetailPanel
          issue={selectedIssue}
          projectId={projectId}
          isOpen={selectedIssueId !== null}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}
