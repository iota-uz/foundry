/**
 * Repository Filter Component
 *
 * Multi-select dropdown for filtering issues by repository.
 * Features:
 * - Chip display for selected repos
 * - "All repositories" option
 * - Terminal-inspired dropdown styling
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

interface RepoFilterProps {
  availableRepos: string[];
  selectedRepos: string[];
  onSelectionChange: (repos: string[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function RepoFilter({
  availableRepos,
  selectedRepos,
  onSelectionChange,
}: RepoFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleRepo = (repo: string) => {
    if (selectedRepos.includes(repo)) {
      onSelectionChange(selectedRepos.filter((r) => r !== repo));
    } else {
      onSelectionChange([...selectedRepos, repo]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
    setIsOpen(false);
  };

  const handleSelectAll = () => {
    onSelectionChange([...availableRepos]);
  };

  const isAllSelected = selectedRepos.length === 0;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2
          px-3 py-1.5 rounded-lg
          text-sm font-medium
          transition-all duration-150
          ${selectedRepos.length > 0
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : 'bg-bg-tertiary text-text-secondary border border-border-default hover:border-border-hover'
          }
        `}
      >
        <FunnelIcon className="w-4 h-4" />
        <span className="font-mono text-xs">
          {isAllSelected ? 'All repos' : `${selectedRepos.length} selected`}
        </span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Selected repo chips */}
      {selectedRepos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedRepos.map((repo) => (
            <span
              key={repo}
              className={`
                inline-flex items-center gap-1
                px-2 py-0.5 rounded-md
                bg-bg-tertiary border border-border-default
                text-xs font-mono text-text-secondary
                group
              `}
            >
              <span className="truncate max-w-[120px]">{repo}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleRepo(repo);
                }}
                className="text-text-tertiary hover:text-accent-error transition-colors"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={handleClearAll}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute top-full left-0 mt-2 z-50
            min-w-[240px] max-h-[280px]
            bg-bg-elevated border border-border-default rounded-lg
            shadow-xl shadow-black/30
            overflow-hidden
          `}
        >
          {/* Terminal header */}
          <div className="px-3 py-2 border-b border-border-subtle bg-bg-secondary">
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-tertiary">
              <span className="text-emerald-400">$</span>
              <span>filter</span>
              <span className="text-text-muted">--repos</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
            <button
              onClick={handleClearAll}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-colors
                ${isAllSelected
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
                }
              `}
            >
              All
            </button>
            <button
              onClick={handleSelectAll}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-colors
                ${selectedRepos.length === availableRepos.length && availableRepos.length > 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
                }
              `}
            >
              Select all
            </button>
          </div>

          {/* Repo list */}
          <div className="max-h-[180px] overflow-y-auto py-1">
            {availableRepos.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-text-tertiary font-mono">No repos found</p>
              </div>
            ) : (
              availableRepos.map((repo) => {
                const isSelected = selectedRepos.includes(repo);
                return (
                  <button
                    key={repo}
                    onClick={() => handleToggleRepo(repo)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2
                      text-sm text-left transition-colors
                      ${isSelected
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-text-secondary hover:bg-bg-hover'
                      }
                    `}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center
                        transition-colors
                        ${isSelected
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-border-default'
                        }
                      `}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Repo name */}
                    <span className="font-mono text-xs truncate">{repo}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
