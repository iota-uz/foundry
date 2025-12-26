/**
 * Workflows List Page
 *
 * Production-grade landing page with Linear/Vercel-inspired styling.
 * Features:
 * - Skeleton loading states
 * - Polished workflow cards with hover effects
 * - Clean empty state
 * - Relative time formatting
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  BoltIcon,
  ClockIcon,
  TrashIcon,
  PlayIcon,
  ExclamationCircleIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/layout';
import { EmptyState, Button, SkeletonCard } from '@/components/shared';
import { formatRelativeTime } from '@/lib/design-system';

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
// Main Component
// ============================================================================

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = (await response.json()) as { workflows: Workflow[] };
      setWorkflows(data.workflows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load workflows'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteWorkflow(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete workflow');
    }
  }

  function handleCreateNew() {
    router.push('/workflows/new');
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Breadcrumbs items={[{ label: 'Workflows' }]} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Workflows
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Visual workflow builder for Claude Code automation
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleCreateNew}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              New Workflow
            </Button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {(error != null && error !== '') && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-full bg-accent-error/10 flex items-center justify-center mb-4">
                <ExclamationCircleIcon className="w-6 h-6 text-accent-error" />
              </div>
              <p className="text-text-primary font-medium mb-1">
                Failed to load workflows
              </p>
              <p className="text-sm text-text-tertiary mb-4">{error}</p>
              <Button variant="secondary" onClick={fetchWorkflows}>
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && (error == null || error === '') && workflows.length === 0 && (
            <EmptyState
              icon={<BoltIcon className="w-12 h-12" />}
              title="No workflows yet"
              description="Create your first workflow to automate Claude Code tasks"
              action={{
                label: 'Create Workflow',
                onClick: handleCreateNew,
              }}
              size="lg"
            />
          )}

          {/* Workflows grid */}
          {!isLoading && (error == null || error === '') && workflows.length > 0 && (
            <>
              {/* Stats bar */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border-subtle">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Squares2X2Icon className="w-4 h-4" />
                  <span>
                    {workflows.length} workflow
                    {workflows.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onDelete={() => deleteWorkflow(workflow.id, workflow.name)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Workflow Card
// ============================================================================

interface WorkflowCardProps {
  workflow: Workflow;
  onDelete: () => void;
}

function WorkflowCard({ workflow, onDelete }: WorkflowCardProps) {
  const nodeCount = (workflow.nodes as unknown[]).length;
  const updatedAt = formatRelativeTime(new Date(workflow.updatedAt));

  return (
    <div
      className={`
        group relative rounded-lg
        border border-border-default
        bg-bg-secondary
        hover:border-accent-primary/50
        hover:bg-bg-tertiary
        transition-all duration-150
      `}
    >
      {/* Main content - clickable */}
      <Link href={`/workflows/${workflow.id}`} className="block p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
            <BoltIcon className="w-5 h-5 text-accent-primary" />
          </div>
        </div>

        <h3 className="font-semibold text-text-primary mb-1 truncate">
          {workflow.name}
        </h3>

        {(workflow.description != null && workflow.description !== '') ? (
          <p className="text-sm text-text-secondary mb-3 line-clamp-2 h-10">
            {workflow.description}
          </p>
        ) : (
          <p className="text-sm text-text-tertiary italic mb-3 h-10">
            No description
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span className="px-2 py-0.5 rounded-full bg-bg-tertiary">
            {nodeCount} node{nodeCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {updatedAt}
          </span>
        </div>
      </Link>

      {/* Actions - visible on hover */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/workflows/${workflow.id}`}
          className={`
            p-1.5 rounded-md cursor-pointer
            text-accent-success hover:bg-accent-success/10
            transition-colors
          `}
          title="Run workflow"
        >
          <PlayIcon className="w-4 h-4" />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className={`
            p-1.5 rounded-md
            text-accent-error hover:bg-accent-error/10
            transition-colors
          `}
          title="Delete workflow"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
