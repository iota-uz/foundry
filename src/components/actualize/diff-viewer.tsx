'use client';

/**
 * Diff Viewer Component
 *
 * Shows spec vs code differences in a side-by-side or unified view.
 */

import { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface DiffEntry {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  specContent?: string;
  codeContent?: string;
  diff: DiffLine[];
}

export interface DiffLine {
  lineNumber: number;
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  specLine?: number;
  codeLine?: number;
}

interface DiffViewerProps {
  diffs: DiffEntry[];
  selectedFile?: string;
  onSelectFile?: (filePath: string) => void;
  viewMode?: 'split' | 'unified';
  onToggleViewMode?: () => void;
}

export function DiffViewer({
  diffs,
  selectedFile,
  onSelectFile,
  viewMode = 'split',
  onToggleViewMode,
}: DiffViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleFileExpansion = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };

  const getChangeTypeColor = (changeType: DiffEntry['changeType']) => {
    switch (changeType) {
      case 'added':
        return 'text-green-400 bg-green-900/20';
      case 'modified':
        return 'text-blue-400 bg-blue-900/20';
      case 'deleted':
        return 'text-red-400 bg-red-900/20';
    }
  };

  const getLineTypeColor = (lineType: DiffLine['type']) => {
    switch (lineType) {
      case 'added':
        return 'bg-green-900/30 border-l-2 border-green-500';
      case 'removed':
        return 'bg-red-900/30 border-l-2 border-red-500';
      case 'modified':
        return 'bg-blue-900/30 border-l-2 border-blue-500';
      default:
        return '';
    }
  };

  const selectedDiff = diffs.find((d) => d.filePath === selectedFile);

  return (
    <div className="flex h-full gap-4">
      {/* File list sidebar */}
      <div className="w-64 border-r border-gray-700 overflow-y-auto">
        <div className="p-3 border-b border-gray-700">
          <h3 className="font-semibold text-white text-sm">Changed Files</h3>
          <p className="text-xs text-gray-500 mt-1">{diffs.length} files</p>
        </div>

        <div className="p-2 space-y-1">
          {diffs.map((diff) => (
            <button
              key={diff.filePath}
              onClick={() => onSelectFile?.(diff.filePath)}
              className={`
                w-full text-left px-3 py-2 rounded text-sm
                transition-colors
                ${
                  selectedFile === diff.filePath
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }
              `}
              aria-label={`Select file ${diff.filePath}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`
                    inline-block w-1.5 h-1.5 rounded-full flex-shrink-0
                    ${
                      diff.changeType === 'added'
                        ? 'bg-green-500'
                        : diff.changeType === 'modified'
                        ? 'bg-blue-500'
                        : 'bg-red-500'
                    }
                  `}
                />
                <span className="truncate font-mono text-xs">{diff.filePath}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1 capitalize">{diff.changeType}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-gray-700 p-3 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedDiff ? (
              <span className="font-mono">{selectedDiff.filePath}</span>
            ) : (
              'Select a file to view diff'
            )}
          </div>
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium transition-colors"
              aria-label={`Switch to ${viewMode === 'split' ? 'unified' : 'split'} view`}
            >
              {viewMode === 'split' ? 'Unified' : 'Split'} View
            </button>
          )}
        </div>

        {/* Diff display */}
        <div className="flex-1 overflow-auto">
          {!selectedDiff ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a file to view changes
            </div>
          ) : viewMode === 'split' ? (
            // Split view
            <div className="grid grid-cols-2 divide-x divide-gray-700 h-full">
              {/* Spec (left) */}
              <div className="overflow-auto">
                <div className="bg-gray-900/40 px-3 py-2 border-b border-gray-700">
                  <span className="text-xs font-semibold text-gray-400">Specification</span>
                </div>
                <pre className="p-4 text-sm font-mono">
                  {selectedDiff.specContent || <span className="text-gray-500 italic">No spec content</span>}
                </pre>
              </div>

              {/* Code (right) */}
              <div className="overflow-auto">
                <div className="bg-gray-900/40 px-3 py-2 border-b border-gray-700">
                  <span className="text-xs font-semibold text-gray-400">Current Code</span>
                </div>
                <pre className="p-4 text-sm font-mono">
                  {selectedDiff.codeContent || <span className="text-gray-500 italic">No code content</span>}
                </pre>
              </div>
            </div>
          ) : (
            // Unified view
            <div className="overflow-auto">
              <table className="w-full text-sm font-mono">
                <tbody>
                  {selectedDiff.diff.map((line, idx) => (
                    <tr key={idx} className={getLineTypeColor(line.type)}>
                      <td className="px-2 py-0.5 text-gray-500 text-right select-none w-12">
                        {line.lineNumber}
                      </td>
                      <td className="px-2 py-0.5 text-gray-500 text-center select-none w-6">
                        {line.type === 'added' && '+'}
                        {line.type === 'removed' && '-'}
                        {line.type === 'modified' && '~'}
                      </td>
                      <td className="px-2 py-0.5 text-gray-200 whitespace-pre-wrap break-all">
                        {line.content}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
