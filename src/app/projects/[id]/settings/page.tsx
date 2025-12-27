/**
 * Project Settings Page
 *
 * Configure project settings.
 * Features:
 * - Edit project name and description
 * - Quick links to automations and workflows
 * - Danger zone for project deletion
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  BoltIcon,
  RectangleStackIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Input, Button } from '@/components/shared';
import { updateProjectAction, deleteProjectAction } from '@/lib/actions/projects';

// ============================================================================
// Types
// ============================================================================

interface Project {
  id: string;
  name: string;
  description: string | null;
  githubProjectOwner: string;
  githubProjectNumber: number;
  syncIntervalMinutes: number | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Page Component
// ============================================================================

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Fetch project
  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to load project');
      }
      const data = await response.json() as Project;
      setProject(data);
      setName(data.name);
      setDescription(data.description ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void fetchProject();
    }
  }, [projectId, fetchProject]);

  // Save changes
  const handleSave = async () => {
    if (!project) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const result = await updateProjectAction({
        id: projectId,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (result?.data?.project) {
        setProject({
          ...project,
          name: result.data.project.name,
          description: result.data.project.description,
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete project
  const handleDelete = async () => {
    if (deleteInput !== project?.name) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteProjectAction({ id: projectId });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setIsDeleting(false);
    }
  };

  // Check if form has changes
  const hasChanges = project && (
    name.trim() !== project.name ||
    (description.trim() || null) !== (project.description || null)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">Project not found</p>
          <Link href="/" className="text-accent-primary hover:underline mt-2 inline-block">
            Return to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Navigation */}
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${projectId}`}
                className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Project
              </Link>

              <div className="h-4 w-px bg-border-subtle" />

              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500/10 border border-purple-500/30">
                  <Cog6ToothIcon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-lg font-medium text-text-primary">Settings</h1>
                  <span className="text-xs font-mono text-text-tertiary">
                    {project.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative scan line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.3), transparent)',
          }}
        />
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-lg bg-accent-error/10 border border-accent-error/30 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-accent-error">{error}</p>
          </div>
        )}

        {/* Success banner */}
        {saveSuccess && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-emerald-400">Changes saved successfully</p>
          </div>
        )}

        {/* General Settings */}
        <section className="bg-bg-secondary border border-border-default rounded-xl p-6">
          <h2 className="text-lg font-medium text-text-primary mb-6">General</h2>

          <div className="space-y-6">
            <Input
              label="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
            />

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this project (optional)"
                rows={3}
                className={`
                  w-full px-3 py-2
                  bg-bg-secondary text-text-primary text-sm
                  border border-border-default rounded-md
                  placeholder:text-text-tertiary
                  transition-all duration-150 ease-out
                  focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary
                  hover:border-border-hover
                  resize-none
                `}
              />
            </div>

            {/* GitHub info (read-only) */}
            <div className="pt-4 border-t border-border-subtle">
              <p className="text-xs text-text-tertiary mb-3">GitHub Project</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="font-mono">{project.githubProjectOwner}</span>
                <span className="text-text-tertiary">/</span>
                <span className="font-mono">#{project.githubProjectNumber}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="bg-bg-secondary border border-border-default rounded-xl p-6">
          <h2 className="text-lg font-medium text-text-primary mb-6">Configuration</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href={`/projects/${projectId}/automations`}
              className="group flex items-center gap-4 p-4 rounded-lg border border-border-default hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 group-hover:border-emerald-500/50">
                <BoltIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-text-primary">Automations</p>
                <p className="text-sm text-text-tertiary">Configure workflow triggers</p>
              </div>
            </Link>

            <Link
              href={`/projects/${projectId}?tab=workflows`}
              className="group flex items-center gap-4 p-4 rounded-lg border border-border-default hover:border-accent-primary/50 hover:bg-accent-primary/5 transition-all"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-primary/10 border border-accent-primary/30 group-hover:border-accent-primary/50">
                <RectangleStackIcon className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <p className="font-medium text-text-primary">Workflows</p>
                <p className="text-sm text-text-tertiary">Manage project workflows</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-bg-secondary border border-accent-error/30 rounded-xl p-6">
          <h2 className="text-lg font-medium text-accent-error mb-2">Danger Zone</h2>
          <p className="text-sm text-text-tertiary mb-6">
            Irreversible and destructive actions
          </p>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border-default">
            <div>
              <p className="font-medium text-text-primary">Delete this project</p>
              <p className="text-sm text-text-tertiary">
                Once deleted, this project and all its data will be permanently removed.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirm(true)}
              className="!border-accent-error/50 !text-accent-error hover:!bg-accent-error/10"
            >
              Delete
            </Button>
          </div>
        </section>
      </main>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => {
              setDeleteConfirm(false);
              setDeleteInput('');
            }}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 bg-bg-primary border border-border-default rounded-xl shadow-2xl shadow-black/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-500/10 border border-red-500/30">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-text-primary">
                  Delete Project
                </h3>
                <p className="text-sm text-text-tertiary mt-2">
                  This action cannot be undone. This will permanently delete the
                  project <span className="font-mono text-text-primary">{project.name}</span> and
                  all associated data including automations and workflows.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm text-text-secondary mb-2">
                Type <span className="font-mono text-text-primary">{project.name}</span> to confirm
              </label>
              <Input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={project.name}
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirm(false);
                  setDeleteInput('');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteInput !== project.name || isDeleting}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium
                  bg-red-500/10 border border-red-500/40 text-red-400
                  hover:bg-red-500/20 hover:border-red-500/60
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Background pattern */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 49%, rgb(168, 85, 247) 50%, transparent 51%),
            linear-gradient(0deg, transparent 49%, rgb(168, 85, 247) 50%, transparent 51%)
          `,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}
