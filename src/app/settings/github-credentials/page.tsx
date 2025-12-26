/**
 * GitHub Credentials Settings Page
 *
 * Manage saved GitHub Personal Access Tokens.
 * Features:
 * - List all credentials
 * - Add new credential
 * - Edit existing credentials
 * - Delete credentials
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/layout';
import { Button, EmptyState, Skeleton } from '@/components/shared';
import { GitHubCredentialModal } from '@/components/projects/github-credential-modal';
import {
  listGitHubCredentialsAction,
  deleteGitHubCredentialAction,
  type SafeGitHubCredential,
} from '@/lib/actions/github-credentials';

// ============================================================================
// Credential Card Component
// ============================================================================

interface CredentialCardProps {
  credential: SafeGitHubCredential;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function CredentialCard({ credential, onEdit, onDelete, isDeleting }: CredentialCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    if (showDeleteConfirm) {
      onDelete();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div
      className={`
        bg-bg-secondary border border-border-default rounded-lg
        p-4 transition-all duration-150
        hover:border-border-hover
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 bg-bg-tertiary rounded-lg flex-shrink-0">
            <KeyIcon className="w-5 h-5 text-text-tertiary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {credential.name}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              Added {new Date(credential.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className={`
              p-2 rounded-md
              text-text-tertiary hover:text-text-primary
              hover:bg-bg-hover
              transition-colors
            `}
            title="Edit credential"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteClick}
            onBlur={() => setShowDeleteConfirm(false)}
            className={`
              p-2 rounded-md transition-colors
              ${showDeleteConfirm
                ? 'bg-accent-error/10 text-accent-error hover:bg-accent-error/20'
                : 'text-text-tertiary hover:text-accent-error hover:bg-bg-hover'
              }
            `}
            title={showDeleteConfirm ? 'Click again to confirm' : 'Delete credential'}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <p className="text-xs text-accent-error">
            Click delete again to confirm, or click elsewhere to cancel.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function CredentialSkeleton() {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function GitHubCredentialsPage() {
  const [credentials, setCredentials] = useState<SafeGitHubCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<{ id: string; name: string } | undefined>();

  const fetchCredentials = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listGitHubCredentialsAction({});
      if (result?.data?.credentials) {
        setCredentials(result.data.credentials);
      } else if (result?.serverError) {
        setError(result.serverError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCredentials();
  }, [fetchCredentials]);

  const handleAddNew = () => {
    setEditingCredential(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (credential: SafeGitHubCredential) => {
    setEditingCredential({ id: credential.id, name: credential.name });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const result = await deleteGitHubCredentialAction({ id });
      if (result?.data?.success) {
        setCredentials((prev) => prev.filter((c) => c.id !== id));
      } else if (result?.serverError) {
        setError(result.serverError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete credential');
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalSave = () => {
    void fetchCredentials();
    setIsModalOpen(false);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCredential(undefined);
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Breadcrumbs
        items={[
          { label: 'Settings', href: '/settings' },
          { label: 'GitHub Credentials' },
        ]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                GitHub Credentials
                <KeyIcon className="w-6 h-6 text-text-tertiary" />
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Manage your saved GitHub Personal Access Tokens
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleAddNew}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              Add Credential
            </Button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-accent-error/10 border border-accent-error/30 flex items-start gap-3">
              <ExclamationCircleIcon className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-accent-error font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
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
            <div className="space-y-3">
              <CredentialSkeleton />
              <CredentialSkeleton />
              <CredentialSkeleton />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && credentials.length === 0 && (
            <EmptyState
              icon={<KeyIcon className="w-12 h-12" />}
              title="No credentials saved"
              description="Add your GitHub Personal Access Tokens for easy reuse across projects"
              action={{
                label: 'Add Credential',
                onClick: handleAddNew,
              }}
              size="lg"
            />
          )}

          {/* Credentials list */}
          {!isLoading && credentials.length > 0 && (
            <>
              {/* Stats */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border-subtle">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <KeyIcon className="w-4 h-4" />
                  <span>
                    {credentials.length} credential
                    {credentials.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {credentials.map((credential) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    onEdit={() => handleEdit(credential)}
                    onDelete={() => void handleDelete(credential.id)}
                    isDeleting={deletingId === credential.id}
                  />
                ))}
              </div>

              {/* Help text */}
              <div className="mt-8 p-4 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <h4 className="text-sm font-medium text-text-primary mb-2">
                  About GitHub Tokens
                </h4>
                <p className="text-xs text-text-tertiary">
                  Personal Access Tokens (PATs) are encrypted before storage and never exposed in the UI.
                  Tokens require <code className="px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary">repo</code> and{' '}
                  <code className="px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary">project</code> scopes
                  to work with GitHub Projects.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Credential modal */}
      <GitHubCredentialModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        credential={editingCredential}
        onSave={handleModalSave}
      />
    </div>
  );
}
