/**
 * Repository List Component
 *
 * Displays and manages linked GitHub repositories.
 * Features:
 * - Add new repository with owner/repo inputs
 * - Remove existing repositories
 * - Repository badges with owner/repo format
 * - GitHub-themed styling
 */

'use client';

import React, { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/shared';

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
// Types
// ============================================================================

export interface RepoItem {
  id?: string;
  owner: string;
  repo: string;
}

interface RepoListProps {
  repos: RepoItem[];
  onAdd: (owner: string, repo: string) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RepoList({ repos, onAdd, onRemove, disabled }: RepoListProps) {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);

    const trimmedOwner = owner.trim();
    const trimmedRepo = repo.trim();

    if (!trimmedOwner || !trimmedRepo) {
      setError('Both owner and repository name are required');
      return;
    }

    // Check for duplicates
    const exists = repos.some(
      (r) =>
        r.owner.toLowerCase() === trimmedOwner.toLowerCase() &&
        r.repo.toLowerCase() === trimmedRepo.toLowerCase()
    );

    if (exists) {
      setError('This repository is already added');
      return;
    }

    onAdd(trimmedOwner, trimmedRepo);
    setOwner('');
    setRepo('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text-primary mb-3">
        Linked Repositories
      </label>

      {/* Repository list */}
      {repos.length > 0 && (
        <div className="mb-4 space-y-2">
          {repos.map((r, index) => (
            <div
              key={r.id ?? `${r.owner}/${r.repo}`}
              className={`
                flex items-center justify-between
                px-3 py-2.5 rounded-lg
                bg-bg-tertiary border border-border-default
                group
              `}
            >
              <div className="flex items-center gap-3">
                <GitHubIcon className="w-4 h-4 text-text-tertiary" />
                <span className="font-mono text-sm text-text-primary">
                  <span className="text-text-secondary">{r.owner}</span>
                  <span className="text-text-tertiary mx-1">/</span>
                  <span>{r.repo}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                className={`
                  p-1 rounded-md
                  text-text-tertiary hover:text-accent-error
                  hover:bg-accent-error/10
                  opacity-0 group-hover:opacity-100
                  transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {repos.length === 0 && (
        <div className="mb-4 px-4 py-6 rounded-lg border border-dashed border-border-default text-center">
          <GitHubIcon className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">
            No repositories linked yet
          </p>
        </div>
      )}

      {/* Add repository form */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="owner"
            className={`
              w-full h-9 px-3
              bg-bg-secondary text-text-primary
              font-mono text-sm
              border border-border-default rounded-md
              placeholder:text-text-tertiary placeholder:font-sans
              transition-all duration-150 ease-out
              focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500
              hover:border-border-hover
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-tertiary
            `}
          />
        </div>
        <span className="flex items-center text-text-tertiary font-mono">/</span>
        <div className="flex-1">
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="repository"
            className={`
              w-full h-9 px-3
              bg-bg-secondary text-text-primary
              font-mono text-sm
              border border-border-default rounded-md
              placeholder:text-text-tertiary placeholder:font-sans
              transition-all duration-150 ease-out
              focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500
              hover:border-border-hover
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-tertiary
            `}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !owner.trim() || !repo.trim()}
          icon={<PlusIcon className="w-4 h-4" />}
        >
          Add
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-accent-error">{error}</p>
      )}
    </div>
  );
}
