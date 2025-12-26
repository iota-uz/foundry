/**
 * Projects List Page
 *
 * Displays all projects with GitHub integration.
 * Features:
 * - Grid layout with project cards
 * - Empty state for new users
 * - Loading skeletons
 * - Quick actions (sync, delete)
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  FolderIcon,
  Squares2X2Icon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/layout';
import { EmptyState, Button, SkeletonCard } from '@/components/shared';
import { ProjectCard } from '@/components/projects';
import { useProjectStore } from '@/store/project.store';

// ============================================================================
// GitHub Icon
// ============================================================================

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProjectsPage() {
  const router = useRouter();
  const {
    projects,
    isLoading,
    isSyncing,
    error,
    fetchProjects,
    deleteProject,
    syncProject,
    clearError,
  } = useProjectStore();

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleCreateNew = () => {
    router.push('/projects/new');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await deleteProject(id);
    } catch {
      alert('Failed to delete project');
    }
  };

  const handleSync = async (id: string) => {
    try {
      await syncProject(id);
    } catch {
      alert('Failed to sync project');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Breadcrumbs items={[{ label: 'Projects' }]} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                Projects
                <GitHubIcon className="w-6 h-6 text-text-tertiary" />
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                GitHub Projects V2 integrated Kanban boards
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleCreateNew}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              New Project
            </Button>
          </div>

          {/* Error banner */}
          {(error != null && error !== '') && (
            <div className="mb-6 p-4 rounded-lg bg-accent-error/10 border border-accent-error/30 flex items-start gap-3">
              <ExclamationCircleIcon className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-accent-error font-medium">
                  {error}
                </p>
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

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && (error == null || error === '') && projects?.length === 0 && (
            <EmptyState
              icon={<FolderIcon className="w-12 h-12" />}
              title="No projects yet"
              description="Create your first project to sync with GitHub Projects V2"
              action={{
                label: 'Create Project',
                onClick: handleCreateNew,
              }}
              size="lg"
            />
          )}

          {/* Projects grid */}
          {!isLoading && (projects != null) && projects.length > 0 && (
            <>
              {/* Stats bar */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border-subtle">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Squares2X2Icon className="w-4 h-4" />
                  <span>
                    {projects.length} project
                    {projects.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onDelete={() => handleDelete(project.id, project.name)}
                    onSync={() => handleSync(project.id)}
                    isSyncing={isSyncing}
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
