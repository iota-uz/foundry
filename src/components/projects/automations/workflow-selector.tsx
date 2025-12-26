/**
 * Workflow Selector Component
 *
 * Dropdown to select from available workflows.
 * Features:
 * - Workflow search/filter
 * - Shows workflow name and node count
 * - Empty state handling
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, BoltIcon } from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodeCount: number;
}

interface WorkflowSelectorProps {
  value: string;
  onChange: (workflowId: string) => void;
  error?: string | undefined;
}

// ============================================================================
// Component
// ============================================================================

export function WorkflowSelector({ value, onChange, error }: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch workflows
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const response = await fetch('/api/workflows');
        if (response.ok) {
          const { workflows } = await response.json() as { workflows: Workflow[] };
          setWorkflows(workflows ?? []);
        }
      } catch {
        // Silent fail - will show empty state
      } finally {
        setIsLoading(false);
      }
    }

    void fetchWorkflows();
  }, []);

  const selectedWorkflow = workflows.find((w) => w.id === value);
  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-text-primary mb-2">
        Workflow
      </label>

      {/* Selector button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between
          h-10 px-3 rounded-lg
          bg-bg-secondary text-sm
          border transition-all duration-150 ease-out
          focus:outline-none focus:ring-1
          ${error !== undefined && error !== ''
            ? 'border-accent-error focus:ring-accent-error focus:border-accent-error'
            : 'border-border-default hover:border-border-hover focus:ring-emerald-500 focus:border-emerald-500'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2 text-text-tertiary">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Loading workflows...
          </span>
        ) : selectedWorkflow ? (
          <span className="flex items-center gap-2 text-text-primary">
            <BoltIcon className="w-4 h-4 text-emerald-400" />
            <span className="font-mono">{selectedWorkflow.name}</span>
            <span className="text-text-tertiary text-xs">
              ({selectedWorkflow.nodeCount} nodes)
            </span>
          </span>
        ) : (
          <span className="text-text-tertiary">Select a workflow...</span>
        )}
        <svg
          className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {error !== undefined && error !== '' && <p className="mt-1.5 text-sm text-accent-error">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div
            className={`
              absolute top-full left-0 right-0 mt-2 z-50
              max-h-[280px] overflow-hidden
              bg-bg-elevated border border-border-default rounded-lg
              shadow-xl shadow-black/30
            `}
          >
            {/* Search */}
            <div className="p-2 border-b border-border-subtle">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workflows..."
                  className={`
                    w-full h-8 pl-9 pr-3
                    bg-bg-secondary text-text-primary text-sm
                    border border-border-subtle rounded-md
                    placeholder:text-text-tertiary
                    focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500
                  `}
                />
              </div>
            </div>

            {/* Workflow list */}
            <div className="max-h-[200px] overflow-y-auto py-1">
              {filteredWorkflows.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  {workflows.length === 0 ? (
                    <>
                      <BoltIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
                      <p className="text-sm text-text-tertiary">No workflows available</p>
                      <p className="text-xs text-text-muted mt-1">
                        Create a workflow first to use automations
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-text-tertiary">No matching workflows</p>
                  )}
                </div>
              ) : (
                filteredWorkflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => {
                      onChange(workflow.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2
                      text-sm text-left transition-colors
                      ${value === workflow.id
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }
                    `}
                  >
                    <BoltIcon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono truncate">{workflow.name}</div>
                      {workflow.description !== undefined && workflow.description !== '' && (
                        <div className="text-xs text-text-tertiary truncate">
                          {workflow.description}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-text-muted font-mono flex-shrink-0">
                      {workflow.nodeCount}n
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
