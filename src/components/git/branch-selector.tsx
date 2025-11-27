'use client';

import React, { useState } from 'react';
import { CodeBracketIcon, PlusIcon } from '@heroicons/react/24/outline';

interface BranchSelectorProps {
  currentBranch: string;
  onBranchChange: (branch: string) => Promise<void>;
  branches?: string[];
  isLoading?: boolean;
}

export function BranchSelector({
  currentBranch,
  onBranchChange,
  branches = [],
  isLoading = false,
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectBranch = async (branch: string) => {
    if (branch === currentBranch) {
      setIsOpen(false);
      return;
    }

    try {
      setIsChecking(true);
      await onBranchChange(branch);
      setIsOpen(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      alert('Please enter a branch name');
      return;
    }

    try {
      setIsCreating(true);
      // This would call the API to create the branch
      // For now, just create it locally
      await onBranchChange(newBranchName);
      setNewBranchName('');
      setIsOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isChecking}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-tertiary hover:bg-bg-secondary transition-colors text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CodeBracketIcon className="h-4 w-4" />
        <span className="font-medium text-sm">{currentBranch}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-50 overflow-hidden">
            {/* Branches list */}
            <div className="max-h-64 overflow-y-auto">
              {branches.length > 0 ? (
                branches.map((branch) => (
                  <button
                    key={branch}
                    onClick={() => handleSelectBranch(branch)}
                    disabled={isChecking}
                    className={`
                      w-full px-4 py-2.5 text-left text-sm transition-colors text-text-primary
                      ${
                        branch === currentBranch
                          ? 'bg-accent-primary/10 border-l-2 border-accent-primary'
                          : 'hover:bg-bg-tertiary border-l-2 border-transparent'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <CodeBracketIcon className="h-4 w-4" />
                      {branch}
                      {branch === currentBranch && (
                        <span className="ml-auto text-xs text-accent-primary font-semibold">
                          CURRENT
                        </span>
                      )}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-text-secondary text-center">
                  No branches found
                </div>
              )}
            </div>

            {/* Divider */}
            {branches.length > 0 && (
              <div className="border-t border-border-default" />
            )}

            {/* Create new branch */}
            <div className="p-3 space-y-2 border-t border-border-default">
              <label className="block text-xs font-medium text-text-secondary">
                New Branch
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateBranch();
                    }
                  }}
                  placeholder="feature/..."
                  disabled={isCreating}
                  className="flex-1 px-2 py-1.5 text-xs bg-bg-tertiary border border-border-default rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary disabled:opacity-50"
                />
                <button
                  onClick={handleCreateBranch}
                  disabled={isCreating || !newBranchName.trim()}
                  className="p-1.5 bg-accent-primary hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
