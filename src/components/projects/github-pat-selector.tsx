/**
 * GitHub PAT Selector Component
 *
 * Dropdown for selecting from saved GitHub credentials.
 * Features:
 * - Accessible listbox (Headless UI)
 * - Inline "Add new" option
 * - Masked token preview
 * - Loading and empty states
 */

'use client';

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import {
  KeyIcon,
  ChevronUpDownIcon,
  CheckIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { listGitHubCredentialsAction, type SafeGitHubCredential } from '@/lib/actions/github-credentials';
import { GitHubCredentialModal } from './github-credential-modal';

// ============================================================================
// Types
// ============================================================================

interface GitHubPATSelectorProps {
  value: string | null;
  onChange: (credentialId: string | null) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function GitHubPATSelector({
  value,
  onChange,
  error,
  disabled = false,
  className = '',
}: GitHubPATSelectorProps) {
  const [credentials, setCredentials] = useState<SafeGitHubCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCredentials = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await listGitHubCredentialsAction({});
      if (result?.data?.credentials) {
        setCredentials(result.data.credentials);
      }
    } catch (err) {
      setFetchError('Failed to load credentials');
      console.error('Failed to fetch credentials:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCredentials();
  }, [fetchCredentials]);

  const selectedCredential = credentials.find((c) => c.id === value) ?? null;
  const hasError = Boolean(error);

  const handleModalSave = (credential: { id: string; name: string }) => {
    void fetchCredentials().then(() => {
      onChange(credential.id);
    });
    setIsModalOpen(false);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-text-primary mb-2">
        GitHub Personal Access Token
      </label>

      <Listbox value={value} onChange={onChange} disabled={disabled || isLoading}>
        <div className="relative">
          {/* Trigger button */}
          <Listbox.Button
            className={`
              relative w-full h-10 pl-10 pr-10
              bg-bg-secondary text-text-primary text-sm
              border rounded-lg text-left
              transition-all duration-150 ease-out
              focus:outline-none focus:ring-1
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-tertiary
              ${hasError
                ? 'border-accent-error focus:ring-accent-error focus:border-accent-error'
                : 'border-border-default hover:border-border-hover focus:ring-emerald-500 focus:border-emerald-500'
              }
            `}
          >
            {/* Key icon */}
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyIcon className="w-4 h-4 text-text-tertiary" />
            </span>

            {/* Selected value */}
            <span className="block truncate">
              {isLoading ? (
                <span className="flex items-center gap-2 text-text-tertiary">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Loading credentials...
                </span>
              ) : selectedCredential ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium">{selectedCredential.name}</span>
                </span>
              ) : fetchError ? (
                <span className="text-accent-error">{fetchError}</span>
              ) : (
                <span className="text-text-tertiary">Select a credential...</span>
              )}
            </span>

            {/* Chevron */}
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronUpDownIcon className="w-4 h-4 text-text-tertiary" />
            </span>
          </Listbox.Button>

          {/* Dropdown options */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className={`
                absolute z-20 mt-1 w-full
                max-h-60 overflow-auto
                bg-bg-secondary border border-border-default
                rounded-lg shadow-lg
                focus:outline-none
                py-1
              `}
            >
              {credentials.length === 0 && !isLoading && (
                <div className="px-3 py-2 text-sm text-text-tertiary">
                  No saved credentials
                </div>
              )}

              {credentials.map((credential) => (
                <Listbox.Option
                  key={credential.id}
                  value={credential.id}
                  className={({ active, selected }) => `
                    relative cursor-pointer select-none
                    py-2 pl-10 pr-4
                    transition-colors duration-75
                    ${active ? 'bg-bg-hover' : ''}
                    ${selected ? 'text-emerald-400' : 'text-text-primary'}
                  `}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : ''}`}>
                        {credential.name}
                      </span>
                      <span className="block text-xs text-text-tertiary mt-0.5">
                        Created {new Date(credential.createdAt).toLocaleDateString()}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-400">
                          <CheckIcon className="w-4 h-4" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}

              {/* Add new credential option */}
              <div className="border-t border-border-subtle mt-1 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsModalOpen(true);
                  }}
                  className={`
                    w-full flex items-center gap-2
                    py-2 pl-10 pr-4
                    text-sm text-text-secondary
                    hover:bg-bg-hover hover:text-text-primary
                    transition-colors duration-75
                  `}
                >
                  <PlusIcon className="w-4 h-4 absolute left-3" />
                  Add new credential
                </button>
              </div>
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* Error message */}
      {hasError && (
        <p className="mt-2 text-sm text-accent-error">{error}</p>
      )}

      {/* Help text */}
      {!hasError && !selectedCredential && !isLoading && (
        <p className="mt-2 text-xs text-text-tertiary">
          Select a saved credential or{' '}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            add a new one
          </button>
        </p>
      )}

      {/* Add credential modal */}
      <GitHubCredentialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
      />
    </div>
  );
}
