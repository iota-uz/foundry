'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/shared';
import { BranchSelector } from './branch-selector';
import { ChangesList } from './changes-list';
import { CommitForm } from './commit-form';
import {
  ArrowDownOnSquareIcon,
  ArrowUpOnSquareIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface GitPanelState {
  branch: string;
  ahead: number;
  behind: number;
  changes: Array<{
    status: 'A' | 'M' | 'D';
    path: string;
  }>;
  isLoading: boolean;
  isExpanded: boolean;
  error: string | null;
}

interface GitPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  projectPath?: string;
}

export function GitPanel({
  isOpen,
  onClose,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectPath = '.',
}: GitPanelProps) {
  const [state, setState] = useState<GitPanelState>({
    branch: 'main',
    ahead: 0,
    behind: 0,
    changes: [
      { status: 'M', path: '.foundry/features/user-login.yaml' },
      { status: 'A', path: '.foundry/components/pages/checkout.html' },
      { status: 'M', path: '.foundry/schemas/schema.dbml' },
    ],
    isLoading: false,
    isExpanded: true,
    error: null,
  });

  const [branches] = useState<string[]>([
    'main',
    'develop',
    'feature/auth',
    'bugfix/validation',
  ]);

  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  const fetchGitStatus = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // In a real implementation, this would call the API
      // const response = await fetch(`/api/git/status?projectPath=${encodeURIComponent(projectPath)}`);
      // const data = await response.json();

      // For now, just use the default state
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch git status',
      }));
    }
  }, []);

  // Fetch Git status on mount and when panel is opened
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    fetchGitStatus();
    // Poll for changes every 30 seconds
    const interval = setInterval(() => {
      fetchGitStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchGitStatus]);

  const handleBranchChange = async (newBranch: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // In a real implementation:
      // await fetch(`/api/git/checkout?projectPath=${encodeURIComponent(projectPath)}`, {
      //   method: 'POST',
      //   body: JSON.stringify({ branch: newBranch }),
      // });

      setState((prev) => ({
        ...prev,
        branch: newBranch,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to checkout branch',
      }));
    }
  };

  const handleCommit = async (_message: string) => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      // In a real implementation:
      // await fetch(`/api/git/commit?projectPath=${encodeURIComponent(projectPath)}`, {
      //   method: 'POST',
      //   body: JSON.stringify({ _message }),
      // });

      // Clear changes after commit
      setState((prev) => ({
        ...prev,
        changes: [],
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to commit',
      }));
    }
  };

  const handlePull = async () => {
    try {
      setIsPulling(true);
      setState((prev) => ({ ...prev, error: null }));

      // In a real implementation:
      // await fetch(`/api/git/pull?projectPath=${encodeURIComponent(projectPath)}`, {
      //   method: 'POST',
      // });

      // Simulate pulling and reduce behind count
      setState((prev) => ({
        ...prev,
        behind: 0,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to pull',
      }));
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    try {
      setIsPushing(true);
      setState((prev) => ({ ...prev, error: null }));

      // In a real implementation:
      // await fetch(`/api/git/push?projectPath=${encodeURIComponent(projectPath)}`, {
      //   method: 'POST',
      // });

      // Simulate pushing and reduce ahead count
      setState((prev) => ({
        ...prev,
        ahead: 0,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to push',
      }));
    } finally {
      setIsPushing(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const hasChanges = state.changes.length > 0;

  return (
    <div className="w-full max-w-sm bg-bg-secondary border-l border-border-default rounded-lg shadow-lg flex flex-col h-full max-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <h3 className="font-semibold text-text-primary">Git</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
        >
          <XMarkIcon className="h-5 w-5 text-text-secondary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Branch selector */}
        <div className="px-4 py-3 border-b border-border-default space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">
              Branch
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary">
                ↑ {state.ahead}
              </span>
              <span className="text-xs text-text-tertiary">
                ↓ {state.behind}
              </span>
            </div>
          </div>
          <BranchSelector
            currentBranch={state.branch}
            onBranchChange={handleBranchChange}
            branches={branches}
            isLoading={state.isLoading}
          />
        </div>

        {/* Changes section */}
        <div className="px-4 py-3 border-b border-border-default">
          <button
            onClick={() =>
              setState((prev) => ({ ...prev, isExpanded: !prev.isExpanded }))
            }
            className="flex items-center justify-between w-full mb-2"
          >
            <h4 className="text-sm font-semibold text-text-primary">
              Changes ({state.changes.length})
            </h4>
            {state.isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-text-secondary" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-text-secondary" />
            )}
          </button>

          {state.isExpanded && (
            <div className="bg-bg-tertiary rounded-md p-3 max-h-40 overflow-y-auto">
              <ChangesList
                changes={state.changes}
                isLoading={state.isLoading}
              />
            </div>
          )}
        </div>

        {/* Commit form */}
        <div className="px-4 py-3 border-b border-border-default flex-1">
          <CommitForm
            onCommit={handleCommit}
            isLoading={state.isLoading}
            hasChanges={hasChanges}
          />
        </div>

        {/* Error message */}
        {state.error && (
          <div className="px-4 py-3 bg-accent-error/10 border-b border-accent-error text-sm text-accent-error">
            {state.error}
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="px-4 py-3 border-t border-border-default flex gap-2">
        <Button
          onClick={handlePull}
          variant="secondary"
          size="sm"
          disabled={state.isLoading || isPulling || isPushing}
          className="flex-1"
        >
          <ArrowDownOnSquareIcon className="h-4 w-4 mr-1" />
          {isPulling ? 'Pulling...' : 'Pull'}
        </Button>
        <Button
          onClick={handlePush}
          variant="secondary"
          size="sm"
          disabled={state.isLoading || isPulling || isPushing || state.ahead === 0}
          className="flex-1"
        >
          <ArrowUpOnSquareIcon className="h-4 w-4 mr-1" />
          {isPushing ? 'Pushing...' : 'Push'}
        </Button>
      </div>
    </div>
  );
}
