/**
 * Workflows List Page
 *
 * Landing page showing all workflows with ability to create new ones.
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
} from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/layout';
import { EmptyState, Button } from '@/components/shared';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = await response.json() as { workflows: Workflow[] };
      setWorkflows(data.workflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
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

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Workflows</h1>
              <p className="text-text-secondary mt-1">
                Visual workflow builder for Claude Code automation
              </p>
            </div>
            <Button variant="primary" onClick={handleCreateNew}>
              <PlusIcon className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-lg bg-bg-secondary animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="secondary" onClick={fetchWorkflows}>
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && workflows.length === 0 && (
            <EmptyState
              icon={<BoltIcon className="w-12 h-12" />}
              title="No workflows yet"
              description="Create your first workflow to automate Claude Code tasks"
              action={{
                label: 'Create Workflow',
                onClick: handleCreateNew,
              }}
            />
          )}

          {/* Workflows grid */}
          {!isLoading && !error && workflows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onDelete={() => deleteWorkflow(workflow.id, workflow.name)}
                />
              ))}
            </div>
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
  const updatedAt = new Date(workflow.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="group relative rounded-lg border border-border-default bg-bg-secondary hover:border-blue-500/50 transition-colors">
      {/* Main content - clickable */}
      <Link href={`/workflows/${workflow.id}`} className="block p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <BoltIcon className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        <h3 className="font-semibold text-text-primary mb-1 truncate">
          {workflow.name}
        </h3>

        {workflow.description && (
          <p className="text-sm text-text-secondary mb-3 line-clamp-2">
            {workflow.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-text-tertiary">
          <span>{nodeCount} nodes</span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {updatedAt}
          </span>
        </div>
      </Link>

      {/* Actions - visible on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/workflows/${workflow.id}`}
          className="p-1.5 rounded hover:bg-green-500/20 text-green-400 transition-colors"
          title="Run workflow"
        >
          <PlayIcon className="w-4 h-4" />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
          title="Delete workflow"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
