/**
 * GitHub Credential Modal
 *
 * Modal for adding/editing GitHub Personal Access Tokens.
 * Features:
 * - Name and token input fields
 * - Token format validation
 * - Save/Cancel/Delete actions
 * - Loading states
 * - Uses existing Modal component
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/shared/modal';
import { Button } from '@/components/shared/button';
import { GitHubTokenInput } from './github-token-input';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  createGitHubCredentialAction,
  updateGitHubCredentialAction,
  deleteGitHubCredentialAction,
} from '@/lib/actions/github-credentials';

// ============================================================================
// Types
// ============================================================================

interface GitHubCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential?: { id: string; name: string } | undefined;
  onSave?: ((credential: { id: string; name: string }) => void) | undefined;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

// ============================================================================
// Token Format Validation
// ============================================================================

function validateTokenFormat(token: string): boolean {
  return token.startsWith('ghp_') || token.startsWith('github_pat_');
}

// ============================================================================
// Component
// ============================================================================

export function GitHubCredentialModal({
  isOpen,
  onClose,
  credential,
  onSave,
}: GitHubCredentialModalProps) {
  const isEditMode = Boolean(credential);

  // Form state
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [tokenValidation, setTokenValidation] = useState<ValidationStatus>('idle');
  const [tokenMessage, setTokenMessage] = useState<string | undefined>();

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(credential?.name ?? '');
      setToken('');
      setTokenValidation('idle');
      setTokenMessage(undefined);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, credential]);

  // Validate token format on change
  const handleTokenChange = useCallback((value: string) => {
    setToken(value);
    setError(null);

    if (value === '') {
      setTokenValidation('idle');
      setTokenMessage(undefined);
      return;
    }

    if (validateTokenFormat(value)) {
      setTokenValidation('valid');
      setTokenMessage('Token format valid');
    } else {
      setTokenValidation('invalid');
      setTokenMessage('Token must start with ghp_ or github_pat_');
    }
  }, []);

  // Handle save
  const handleSave = async () => {
    setError(null);

    // Validation
    if (name.trim() === '') {
      setError('Name is required');
      return;
    }

    // In edit mode, token is optional (only update if provided)
    if (!isEditMode && token === '') {
      setError('Token is required');
      return;
    }

    if (token !== '' && !validateTokenFormat(token)) {
      setError('Token must start with ghp_ or github_pat_');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode && credential) {
        // Update existing credential
        const updateData: { name?: string; token?: string } = {};
        if (name !== credential.name) {
          updateData.name = name.trim();
        }
        if (token !== '') {
          updateData.token = token;
        }

        const result = await updateGitHubCredentialAction({
          id: credential.id,
          ...updateData,
        });

        if (result?.data?.credential) {
          onSave?.({ id: result.data.credential.id, name: result.data.credential.name });
          onClose();
        } else if (result?.serverError) {
          setError(result.serverError);
        }
      } else {
        // Create new credential
        const result = await createGitHubCredentialAction({
          name: name.trim(),
          token,
        });

        if (result?.data?.credential) {
          onSave?.({ id: result.data.credential.id, name: result.data.credential.name });
          onClose();
        } else if (result?.serverError) {
          setError(result.serverError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!credential) return;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteGitHubCredentialAction({ id: credential.id });

      if (result?.data?.success) {
        onClose();
      } else if (result?.serverError) {
        setError(result.serverError);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete credential');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const isFormValid = name.trim() !== '' && (isEditMode || (token !== '' && tokenValidation === 'valid'));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Credential' : 'Add GitHub Credential'}
      description={isEditMode ? 'Update your saved credential' : 'Save a GitHub Personal Access Token for reuse'}
      size="md"
    >
      <div className="space-y-4">
        {/* Error banner */}
        {error && (
          <div className="p-3 rounded-lg bg-accent-error/10 border border-accent-error/30 flex items-start gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-accent-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-accent-error">{error}</p>
          </div>
        )}

        {/* Name input */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Credential Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Work - Org A"
            disabled={isSaving || isDeleting}
            className={`
              w-full h-10 px-3
              bg-bg-secondary text-text-primary text-sm
              border border-border-default rounded-lg
              placeholder:text-text-tertiary
              transition-all duration-150 ease-out
              focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500
              hover:border-border-hover
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-tertiary
            `}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            A friendly name to identify this token
          </p>
        </div>

        {/* Token input */}
        <div>
          <GitHubTokenInput
            value={token}
            onChange={handleTokenChange}
            validationStatus={tokenValidation}
            validationMessage={tokenMessage}
            disabled={isSaving || isDeleting}
          />
          {isEditMode && (
            <p className="mt-1 text-xs text-text-tertiary">
              Leave blank to keep the existing token
            </p>
          )}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="p-3 rounded-lg bg-accent-error/10 border border-accent-error/30">
            <p className="text-sm text-text-primary mb-3">
              Are you sure you want to delete this credential? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
        <div>
          {isEditMode && !showDeleteConfirm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
              icon={<TrashIcon className="w-4 h-4" />}
              className="text-accent-error hover:text-accent-error hover:bg-accent-error/10"
            >
              Delete
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving || isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={!isFormValid || isSaving || isDeleting || showDeleteConfirm}
          >
            {isSaving ? 'Saving...' : isEditMode ? 'Update' : 'Save Credential'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
