'use client';

/**
 * Change Review Component
 *
 * Review and selectively apply changes from spec to code.
 */

import { useState } from 'react';
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { DiffEntry } from './diff-viewer';

export interface ChangeItem {
  id: string;
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  description: string;
  impact: 'low' | 'medium' | 'high';
  diff: DiffEntry;
  selected: boolean;
}

interface ChangeReviewProps {
  changes: ChangeItem[];
  onToggleChange?: (changeId: string) => void;
  onApplySelected?: () => Promise<void>;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  applying?: boolean;
}

export function ChangeReview({
  changes,
  onToggleChange,
  onApplySelected,
  onSelectAll,
  onDeselectAll,
  applying = false,
}: ChangeReviewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const selectedCount = changes.filter((c) => c.selected).length;
  const totalCount = changes.length;

  const getImpactColor = (impact: ChangeItem['impact']) => {
    switch (impact) {
      case 'low':
        return 'text-green-400 bg-green-900/20';
      case 'medium':
        return 'text-amber-400 bg-amber-900/20';
      case 'high':
        return 'text-red-400 bg-red-900/20';
    }
  };

  const getChangeTypeIcon = (changeType: ChangeItem['changeType']) => {
    switch (changeType) {
      case 'added':
        return <CheckIcon className="h-4 w-4 text-green-400" />;
      case 'modified':
        return <ExclamationTriangleIcon className="h-4 w-4 text-blue-400" />;
      case 'deleted':
        return <XMarkIcon className="h-4 w-4 text-red-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Review Changes</h2>
          <div className="text-sm text-gray-400">
            {selectedCount} of {totalCount} selected
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAll}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium transition-colors"
            aria-label="Select all changes"
          >
            Select All
          </button>
          <button
            onClick={onDeselectAll}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium transition-colors"
            aria-label="Deselect all changes"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Changes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {changes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No changes to review
          </div>
        ) : (
          changes.map((change) => (
            <div
              key={change.id}
              className={`
                rounded-lg border transition-colors
                ${
                  change.selected
                    ? 'border-blue-500 bg-blue-900/10'
                    : 'border-gray-700 bg-gray-800/40'
                }
              `}
            >
              {/* Change header */}
              <div className="p-3">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={change.selected}
                    onChange={() => onToggleChange?.(change.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                    aria-label={`Select change for ${change.filePath}`}
                  />

                  <div className="flex-1 min-w-0">
                    {/* File path and type */}
                    <div className="flex items-center gap-2 mb-2">
                      {getChangeTypeIcon(change.changeType)}
                      <span className="font-mono text-sm text-white truncate">
                        {change.filePath}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-300 mb-2">{change.description}</p>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-700 text-gray-300 capitalize">
                        {change.changeType}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${getImpactColor(
                          change.impact
                        )}`}
                      >
                        {change.impact} impact
                      </span>
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => toggleExpanded(change.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                    aria-label={expandedIds.has(change.id) ? 'Collapse details' : 'Expand details'}
                  >
                    {expandedIds.has(change.id) ? '▼' : '▶'}
                  </button>
                </div>

                {/* Expanded details */}
                {expandedIds.has(change.id) && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="bg-gray-900 rounded p-3 overflow-x-auto">
                      <pre className="text-xs font-mono text-gray-300">
                        {/* Show a preview of the diff */}
                        {change.diff.diff.slice(0, 10).map((line, idx) => (
                          <div
                            key={idx}
                            className={`
                              ${line.type === 'added' ? 'text-green-400' : ''}
                              ${line.type === 'removed' ? 'text-red-400' : ''}
                              ${line.type === 'modified' ? 'text-blue-400' : ''}
                            `}
                          >
                            {line.type === 'added' && '+ '}
                            {line.type === 'removed' && '- '}
                            {line.type === 'modified' && '~ '}
                            {line.content}
                          </div>
                        ))}
                        {change.diff.diff.length > 10 && (
                          <div className="text-gray-500 mt-1">
                            ... {change.diff.diff.length - 10} more lines
                          </div>
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer with apply button */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedCount > 0 ? (
              <span>
                Ready to apply {selectedCount} {selectedCount === 1 ? 'change' : 'changes'}
              </span>
            ) : (
              <span>Select changes to apply</span>
            )}
          </div>
          <button
            onClick={onApplySelected}
            disabled={selectedCount === 0 || applying}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Apply selected changes"
          >
            {applying ? 'Applying...' : `Apply ${selectedCount > 0 ? selectedCount : ''} Changes`}
          </button>
        </div>
      </div>
    </div>
  );
}
