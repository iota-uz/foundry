/**
 * Project Settings Drawer
 *
 * Slide-out panel for editing project settings.
 * Features:
 * - Headless UI Dialog for accessibility (focus trap, escape to close)
 * - Smooth slide-in animation from right
 * - General settings (name, description)
 * - Read-only GitHub project info
 * - Danger zone with delete confirmation
 * - Form validation and dirty state detection
 */

'use client';

import React, { Fragment, useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import {
  XMarkIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Input, Button, Modal } from '@/components/shared';
import { updateProjectAction, deleteProjectAction } from '@/lib/actions/projects';
import type { Project } from '@/store/project.store';

// ============================================================================
// Types
// ============================================================================

interface ProjectSettingsDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Project data */
  project: Project;
  /** Callback when project is updated */
  onProjectUpdated?: (project: Project) => void;
  /** Callback when project is deleted */
  onProjectDeleted?: () => void;
}

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
// Component
// ============================================================================

export function ProjectSettingsDrawer({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
  onProjectDeleted,
}: ProjectSettingsDrawerProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync form state when project changes
  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
  }, [project]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSaveSuccess(false);
      setShowDeleteModal(false);
      setDeleteInput('');
    }
  }, [isOpen]);

  // Check if form has changes
  const hasChanges =
    name.trim() !== project.name ||
    (description.trim() || null) !== (project.description || null);

  // Validate form
  const isValid = name.trim().length > 0;

  // Save changes
  const handleSave = useCallback(async () => {
    if (!hasChanges || !isValid) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const result = await updateProjectAction({
        id: project.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (result?.data?.project) {
        const updatedProject: Project = {
          ...project,
          name: result.data.project.name,
          description: result.data.project.description,
        };
        onProjectUpdated?.(updatedProject);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [project, name, description, hasChanges, isValid, onProjectUpdated]);

  // Delete project
  const handleDelete = useCallback(async () => {
    if (deleteInput !== project.name) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteProjectAction({ id: project.id });
      onProjectDeleted?.();
      onClose();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setIsDeleting(false);
    }
  }, [project, deleteInput, onProjectDeleted, onClose, router]);

  return (
    <>
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={onClose} className="relative z-50">
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          {/* Drawer panel */}
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in duration-200"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-[480px] max-w-[90vw]">
                    <div className="flex h-full flex-col bg-bg-secondary border-l border-border-default shadow-2xl shadow-black/50">
                      {/* Header */}
                      <div className="flex-shrink-0 border-b border-border-default">
                        <div className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500/10 border border-purple-500/30">
                              <Cog6ToothIcon className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <Dialog.Title className="text-base font-semibold text-text-primary">
                                Project Settings
                              </Dialog.Title>
                              <p className="text-xs text-text-tertiary font-mono mt-0.5">
                                {project.name}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={onClose}
                            className="p-2 -mr-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
                            aria-label="Close settings"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Purple accent line */}
                        <div
                          className="h-px"
                          style={{
                            background:
                              'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.4), transparent)',
                          }}
                        />
                      </div>

                      {/* Scrollable content */}
                      <div className="flex-1 overflow-y-auto">
                        <div className="px-5 py-6 space-y-6">
                          {/* Error banner */}
                          {error && (
                            <div className="p-3 rounded-lg bg-accent-error/10 border border-accent-error/30 flex items-start gap-3">
                              <ExclamationTriangleIcon className="w-5 h-5 text-accent-error flex-shrink-0" />
                              <p className="text-sm text-accent-error">{error}</p>
                            </div>
                          )}

                          {/* Success banner */}
                          {saveSuccess && (
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                              <CheckIcon className="w-5 h-5 text-emerald-400" />
                              <p className="text-sm text-emerald-400">
                                Changes saved successfully
                              </p>
                            </div>
                          )}

                          {/* General Settings Section */}
                          <section className="space-y-5">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-text-primary">
                                General
                              </h3>
                              <div className="flex-1 h-px bg-border-subtle" />
                            </div>

                            <Input
                              label="Project Name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Enter project name"
                              error={
                                name.trim().length === 0
                                  ? 'Project name is required'
                                  : undefined
                              }
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
                                  w-full px-3 py-2.5
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
                              <div className="flex items-center gap-2 mb-3">
                                <GitHubIcon className="w-4 h-4 text-text-tertiary" />
                                <span className="text-xs text-text-tertiary">
                                  GitHub Project
                                </span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary rounded-lg">
                                <span className="text-sm text-text-secondary font-mono">
                                  {project.githubProjectOwner}
                                </span>
                                <span className="text-text-muted">/</span>
                                <span className="text-sm text-text-secondary font-mono">
                                  #{project.githubProjectNumber}
                                </span>
                              </div>
                            </div>
                          </section>

                          {/* Danger Zone */}
                          <section className="pt-6 border-t border-border-default">
                            <div className="flex items-center gap-2 mb-4">
                              <h3 className="text-sm font-medium text-accent-error">
                                Danger Zone
                              </h3>
                              <div className="flex-1 h-px bg-accent-error/20" />
                            </div>

                            <div className="p-4 rounded-lg border border-accent-error/20 bg-accent-error/5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-primary">
                                    Delete this project
                                  </p>
                                  <p className="text-xs text-text-tertiary mt-1">
                                    Once deleted, this project and all its data will be
                                    permanently removed.
                                  </p>
                                </div>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setShowDeleteModal(true)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </section>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex-shrink-0 border-t border-border-default bg-bg-primary/50 px-5 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Button variant="ghost" onClick={onClose}>
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={!hasChanges || !isValid || isSaving}
                            loading={isSaving}
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteInput('');
        }}
        title="Delete Project"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-500/10 border border-red-500/30">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-text-secondary leading-relaxed">
                This action cannot be undone. This will permanently delete the project{' '}
                <span className="font-mono text-text-primary">{project.name}</span> and
                all associated data including automations and workflows.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm text-text-secondary mb-2">
              Type{' '}
              <span className="font-mono text-text-primary">{project.name}</span> to
              confirm
            </label>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={project.name}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border-subtle">
          <Button
            variant="ghost"
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteInput('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteInput !== project.name || isDeleting}
            loading={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Project'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
