/**
 * Project Automations Page
 *
 * Configure automation rules for a project.
 * Features:
 * - List of all automations
 * - Create/edit/delete automations
 * - Transition rules configuration
 * - Industrial terminal aesthetic
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  BoltIcon,
  Squares2X2Icon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAutomationStore } from '@/store/automation.store';
import {
  AutomationList,
  AutomationEditor,
} from '@/components/projects/automations';
import type {
  Automation,
  CreateAutomationData,
  UpdateAutomationData,
  CreateTransitionData,
  UpdateTransitionData,
} from '@/store/automation.store';

// ============================================================================
// Page Component
// ============================================================================

export default function ProjectAutomationsPage() {
  const params = useParams();
  const projectId = params?.id as string;

  // Store
  const {
    automations,
    isLoading,
    isSaving,
    error,
    fetchAutomations,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    createTransition,
    updateTransition,
    deleteTransition,
    clearError,
  } = useAutomationStore();

  // Local state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(true);
  const [statusesError, setStatusesError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Automation | null>(null);

  // Fetch available statuses from the project
  const fetchStatuses = useCallback(async () => {
    setStatusesLoading(true);
    setStatusesError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/board`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setStatusesError(data.error ?? `Failed to load project data (${response.status})`);
        return;
      }
      const data = await response.json() as { statuses?: string[] };
      if (data.statuses != null && Array.isArray(data.statuses) && data.statuses.length > 0) {
        setAvailableStatuses(data.statuses);
      } else {
        setStatusesError('No statuses found. Check that the GitHub Project has a Status field configured.');
      }
    } catch (err) {
      setStatusesError(err instanceof Error ? err.message : 'Failed to connect to project');
    } finally {
      setStatusesLoading(false);
    }
  }, [projectId]);

  // Fetch automations on mount
  useEffect(() => {
    if (projectId != null && projectId !== '') {
      void fetchAutomations(projectId);
      void fetchStatuses();
    }
  }, [projectId, fetchAutomations, fetchStatuses]);

  // Handlers
  const handleAddAutomation = useCallback(() => {
    setEditingAutomation(null);
    setIsEditorOpen(true);
    clearError();
  }, [clearError]);

  const handleEditAutomation = useCallback((automation: Automation) => {
    setEditingAutomation(automation);
    setIsEditorOpen(true);
    clearError();
  }, [clearError]);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingAutomation(null);
  }, []);

  const handleSaveAutomation = useCallback(async (data: CreateAutomationData | UpdateAutomationData) => {
    if (editingAutomation != null) {
      await updateAutomation(projectId, editingAutomation.id, data);
    } else {
      const newAutomation = await createAutomation(projectId, data as CreateAutomationData);
      if (newAutomation != null) {
        setEditingAutomation(newAutomation);
      }
    }
  }, [projectId, editingAutomation, createAutomation, updateAutomation]);

  const handleDeleteAutomation = useCallback(async (automation: Automation) => {
    setDeleteConfirm(automation);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteConfirm) {
      await deleteAutomation(projectId, deleteConfirm.id);
      setDeleteConfirm(null);
    }
  }, [projectId, deleteConfirm, deleteAutomation]);

  const handleToggleAutomation = useCallback(async (automation: Automation, enabled: boolean) => {
    await updateAutomation(projectId, automation.id, { enabled });
  }, [projectId, updateAutomation]);

  const handleCreateTransition = useCallback(async (data: CreateTransitionData) => {
    if (editingAutomation) {
      await createTransition(projectId, editingAutomation.id, data);
    }
  }, [projectId, editingAutomation, createTransition]);

  const handleUpdateTransition = useCallback(async (id: string, data: UpdateTransitionData) => {
    if (editingAutomation) {
      await updateTransition(projectId, editingAutomation.id, id, data);
    }
  }, [projectId, editingAutomation, updateTransition]);

  const handleDeleteTransition = useCallback(async (id: string) => {
    if (editingAutomation) {
      await deleteTransition(projectId, editingAutomation.id, id);
    }
  }, [projectId, editingAutomation, deleteTransition]);

  // Find the current editing automation from the store (for updated transitions)
  const currentEditingAutomation = editingAutomation
    ? automations.find((a) => a.id === editingAutomation.id) || editingAutomation
    : null;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Navigation */}
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${projectId}`}
                className={`
                  inline-flex items-center gap-2
                  text-sm text-text-tertiary hover:text-text-primary
                  transition-colors
                `}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Board
              </Link>

              <div className="h-4 w-px bg-border-subtle" />

              {/* Title */}
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-9 h-9 rounded-lg
                    flex items-center justify-center
                    bg-emerald-500/10 border border-emerald-500/30
                  `}
                >
                  <BoltIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-lg font-medium text-text-primary">
                    Automations
                  </h1>
                  <span className="text-xs font-mono text-text-tertiary">
                    project:{projectId.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <Link
              href={`/projects/${projectId}`}
              className={`
                inline-flex items-center gap-2
                px-3 py-1.5 rounded-lg
                text-sm text-text-secondary
                hover:bg-bg-hover hover:text-text-primary
                transition-colors
              `}
            >
              <Squares2X2Icon className="w-4 h-4" />
              View Board
            </Link>
          </div>
        </div>

        {/* Decorative scan line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.3), transparent)',
          }}
        />
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AutomationList
          automations={automations}
          isLoading={isLoading}
          onAdd={handleAddAutomation}
          onEdit={handleEditAutomation}
          onDelete={handleDeleteAutomation}
          onToggle={handleToggleAutomation}
        />
      </main>

      {/* Editor slide-over */}
      <AutomationEditor
        automation={currentEditingAutomation}
        availableStatuses={availableStatuses}
        statusesLoading={statusesLoading}
        statusesError={statusesError}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        onSave={handleSaveAutomation}
        onCreateTransition={handleCreateTransition}
        onUpdateTransition={handleUpdateTransition}
        onDeleteTransition={handleDeleteTransition}
        isSaving={isSaving}
        error={error}
      />

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setDeleteConfirm(null)}
          />
          <div
            className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
              w-full max-w-md p-6
              bg-bg-primary border border-border-default rounded-xl
              shadow-2xl shadow-black/50
            `}
          >
            <div className="flex items-start gap-4">
              <div
                className={`
                  w-10 h-10 rounded-lg
                  flex items-center justify-center flex-shrink-0
                  bg-red-500/10 border border-red-500/30
                `}
              >
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-text-primary">
                  Delete Automation
                </h3>
                <p className="text-sm text-text-tertiary mt-2">
                  Are you sure you want to delete this automation? This will also
                  remove all configured transitions. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className={`
                  px-4 py-2 rounded-lg
                  text-sm font-medium text-text-secondary
                  hover:bg-bg-hover
                  transition-colors
                `}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className={`
                  px-4 py-2 rounded-lg
                  text-sm font-medium
                  bg-red-500/10 border border-red-500/40
                  text-red-400
                  hover:bg-red-500/20 hover:border-red-500/60
                  transition-all duration-200
                `}
              >
                Delete Automation
              </button>
            </div>
          </div>
        </>
      )}

      {/* Background circuit pattern */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 49%, rgb(16, 185, 129) 50%, transparent 51%),
            linear-gradient(0deg, transparent 49%, rgb(16, 185, 129) 50%, transparent 51%)
          `,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}
