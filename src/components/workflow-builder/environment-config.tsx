/**
 * Environment Configuration Panel
 *
 * Manages encrypted environment variables for workflow execution.
 * Features:
 * - Inline editing with masked values
 * - Toggle visibility per variable
 * - Add/delete variables
 * - Auto-save on blur
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useAction } from 'next-safe-action/hooks';
import {
  listWorkflowSecretsAction,
  setWorkflowSecretAction,
  deleteWorkflowSecretAction,
} from '@/lib/actions/workflow-secrets';
import type { SafeWorkflowSecret } from '@/lib/actions/workflow-secrets';

// ============================================================================
// Types
// ============================================================================

interface EnvironmentConfigProps {
  workflowId: string;
}

interface LocalSecret {
  key: string;
  value: string;
  isNew: boolean;
  isSaved: boolean;
  isVisible: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function EnvironmentConfig({ workflowId }: EnvironmentConfigProps) {
  const [secrets, setSecrets] = useState<SafeWorkflowSecret[]>([]);
  const [localEdits, setLocalEdits] = useState<Map<string, LocalSecret>>(new Map());
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Action hooks
  const { execute: listSecrets, isPending: isLoading } = useAction(
    listWorkflowSecretsAction,
    {
      onSuccess: (result) => {
        if (result.data?.secrets) {
          setSecrets(result.data.secrets);
        }
      },
      onError: (err) => {
        setError(err.error.serverError ?? 'Failed to load secrets');
      },
    }
  );

  const { execute: saveSecret, isPending: isSaving } = useAction(
    setWorkflowSecretAction,
    {
      onSuccess: () => {
        // Refresh the list
        listSecrets({ workflowId });
      },
      onError: (err) => {
        setError(err.error.serverError ?? 'Failed to save secret');
      },
    }
  );

  const { execute: removeSecret } = useAction(deleteWorkflowSecretAction, {
    onSuccess: () => {
      // Refresh the list
      listSecrets({ workflowId });
    },
    onError: (err) => {
      setError(err.error.serverError ?? 'Failed to delete secret');
    },
  });

  // Load secrets on mount
  useEffect(() => {
    if (workflowId) {
      listSecrets({ workflowId });
    }
  }, [workflowId, listSecrets]);

  // Handle adding a new variable
  const handleAddVariable = () => {
    if (!newKey.trim()) {
      setError('Variable name is required');
      return;
    }

    // Validate key format
    if (!/^[A-Z][A-Z0-9_]*$/.test(newKey)) {
      setError('Variable name must be uppercase letters, numbers, and underscores (start with letter)');
      return;
    }

    if (!newValue) {
      setError('Value is required');
      return;
    }

    // Save the secret
    saveSecret({ workflowId, key: newKey, value: newValue });

    // Reset form
    setNewKey('');
    setNewValue('');
    setIsAdding(false);
    setError(null);
  };

  // Handle updating a variable value
  const handleUpdateValue = (key: string, value: string) => {
    if (!value.trim()) {
      setError('Value cannot be empty');
      return;
    }

    saveSecret({ workflowId, key, value });

    // Clear local edit state
    setLocalEdits((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    setError(null);
  };

  // Handle deleting a variable
  const handleDelete = (key: string) => {
    removeSecret({ workflowId, key });
    setLocalEdits((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  // Toggle visibility for a variable
  const toggleVisibility = (key: string) => {
    setLocalEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(key);
      if (current) {
        next.set(key, { ...current, isVisible: !current.isVisible });
      } else {
        next.set(key, { key, value: '', isNew: false, isSaved: true, isVisible: true });
      }
      return next;
    });
  };

  // Start editing a variable
  const startEdit = (key: string) => {
    setLocalEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(key);
      if (!current) {
        next.set(key, { key, value: '', isNew: false, isSaved: true, isVisible: true });
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 flex items-center justify-center">
            <KeyIcon className="w-4 h-4 text-accent-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-primary">Environment Variables</h3>
            <p className="text-[11px] text-text-muted">{secrets.length} configured</p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-accent-error/10 border border-accent-error/20 flex items-start gap-2">
          <ExclamationCircleIcon className="w-4 h-4 text-accent-error flex-shrink-0 mt-0.5" />
          <p className="text-xs text-accent-error">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-accent-error hover:text-accent-error/80"
          >
            <span className="sr-only">Dismiss</span>
            &times;
          </button>
        </div>
      )}

      {/* Secrets List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 mx-auto mb-2 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-muted">Loading variables...</p>
          </div>
        ) : secrets.length === 0 && !isAdding ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-bg-tertiary border border-border-subtle flex items-center justify-center">
              <KeyIcon className="w-5 h-5 text-text-tertiary" />
            </div>
            <p className="text-sm text-text-secondary mb-1">No environment variables</p>
            <p className="text-xs text-text-muted mb-4">
              Add variables to configure workflow execution
            </p>
          </div>
        ) : (
          <>
            {secrets.map((secret) => (
              <SecretRow
                key={secret.key}
                secretKey={secret.key}
                localEdit={localEdits.get(secret.key)}
                onToggleVisibility={() => toggleVisibility(secret.key)}
                onStartEdit={() => startEdit(secret.key)}
                onSave={(value) => handleUpdateValue(secret.key, value)}
                onDelete={() => handleDelete(secret.key)}
                isSaving={isSaving}
              />
            ))}
          </>
        )}

        {/* Add New Variable Form */}
        {isAdding && (
          <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">
                Variable Name
              </label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                placeholder="DATABASE_URL"
                className="w-full h-8 px-2 bg-bg-primary border border-border-default rounded-lg text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
                autoFocus
              />
              <p className="text-[10px] text-text-muted mt-1">
                Uppercase letters, numbers, underscores
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">
                Value
              </label>
              <input
                type="password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter value..."
                className="w-full h-8 px-2 bg-bg-primary border border-border-default rounded-lg text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewKey('');
                  setNewValue('');
                  setError(null);
                }}
                className="px-3 h-7 rounded-md text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVariable}
                disabled={isSaving}
                className="px-3 h-7 rounded-md text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Adding...' : 'Add Variable'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border-subtle">
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full h-9 rounded-lg border border-dashed border-border-default hover:border-border-hover bg-bg-tertiary/50 hover:bg-bg-tertiary flex items-center justify-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            Add Variable
          </button>
        )}

        {/* Info Note */}
        <div className="mt-3 flex items-start gap-2 text-[10px] text-text-muted">
          <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>Variables are encrypted at rest and injected during workflow execution.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Secret Row Component
// ============================================================================

interface SecretRowProps {
  secretKey: string;
  localEdit: LocalSecret | undefined;
  onToggleVisibility: () => void;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onDelete: () => void;
  isSaving: boolean;
}

function SecretRow({
  secretKey,
  localEdit,
  onToggleVisibility,
  onStartEdit,
  onSave,
  onDelete,
  isSaving,
}: SecretRowProps) {
  const [editValue, setEditValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isVisible = localEdit?.isVisible ?? false;

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue('');
    onStartEdit();
  };

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue);
    }
    setIsEditing(false);
    setEditValue('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="group p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle hover:border-border-default transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-medium text-text-primary">{secretKey}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onToggleVisibility}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            title={isVisible ? 'Hide value' : 'Show value'}
          >
            {isVisible ? (
              <EyeSlashIcon className="w-3.5 h-3.5" />
            ) : (
              <EyeIcon className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded text-text-muted hover:text-accent-error hover:bg-accent-error/10 transition-colors"
            title="Delete variable"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type={isVisible ? 'text' : 'password'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Small delay to allow button clicks
              setTimeout(() => {
                if (editValue.trim()) {
                  handleSave();
                } else {
                  handleCancel();
                }
              }, 150);
            }}
            placeholder="Enter new value..."
            className="flex-1 h-7 px-2 bg-bg-primary border border-border-default rounded text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
          <button
            onClick={handleSave}
            disabled={isSaving || !editValue.trim()}
            className="p-1.5 rounded bg-accent-success/10 text-accent-success hover:bg-accent-success/20 transition-colors disabled:opacity-50"
          >
            <CheckIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleStartEdit}
          className="w-full h-7 px-2 bg-bg-primary border border-border-subtle rounded text-left text-xs font-mono text-text-muted hover:border-border-default hover:text-text-secondary transition-colors cursor-text"
        >
          Click to update value...
        </button>
      )}
    </div>
  );
}
