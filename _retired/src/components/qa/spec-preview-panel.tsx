'use client';

/**
 * Spec Preview Panel Component
 *
 * Shows live updates to specs as answers are provided.
 * Used in F15 - Live Spec Preview Panel.
 */

import { useState, useMemo, useEffect } from 'react';
import type { SpecDiff, SpecPreview } from '@/lib/utils/spec-differ';
import { formatFieldChange, groupChangesByType } from '@/lib/utils/spec-differ';

interface SpecPreviewPanelProps {
  preview: SpecPreview | null;
  mode?: 'summary' | 'diff' | 'full';
  onModeChange?: (mode: 'summary' | 'diff' | 'full') => void;
  position?: 'right' | 'bottom';
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SpecPreviewPanel({
  preview,
  mode = 'diff',
  onModeChange,
  position = 'right',
  isCollapsed = false,
  onToggleCollapse,
}: SpecPreviewPanelProps) {
  const [highlightedDiff, setHighlightedDiff] = useState<string | null>(null);

  // Group diffs by type
  const groupedDiffs = useMemo(() => {
    if (!preview) return {};
    return groupChangesByType(preview.diffs);
  }, [preview]);

  // Auto-scroll to new changes
  useEffect(() => {
    if (preview && preview.diffs.length > 0) {
      // Flash highlight on latest change
      const latestDiff = preview.diffs[preview.diffs.length - 1];
      setHighlightedDiff(latestDiff?.id || null);

      const timer = setTimeout(() => {
        setHighlightedDiff(null);
      }, 2000);

      return () => clearTimeout(timer);
    }
    return;
  }, [preview?.diffs.length, preview]);

  if (isCollapsed) {
    return (
      <div
        className={`flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/40 p-3 ${
          position === 'right' ? 'mb-4' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-300">Spec Preview</span>
          {preview && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
              {preview.summary.total}
            </span>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Expand →
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-lg border border-gray-700 bg-gray-800/40 ${
        position === 'right' ? 'h-full' : 'max-h-96'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white">Spec Preview</h3>
          {preview && (
            <div className="flex gap-2 text-xs">
              {preview.summary.added > 0 && (
                <span className="rounded bg-green-600/30 px-2 py-0.5 text-green-300">
                  +{preview.summary.added}
                </span>
              )}
              {preview.summary.modified > 0 && (
                <span className="rounded bg-amber-600/30 px-2 py-0.5 text-amber-300">
                  ~{preview.summary.modified}
                </span>
              )}
              {preview.summary.removed > 0 && (
                <span className="rounded bg-red-600/30 px-2 py-0.5 text-red-300">
                  -{preview.summary.removed}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mode selector */}
          <div className="flex gap-1 rounded-lg border border-gray-700 bg-gray-800 p-1">
            <button
              onClick={() => onModeChange?.('summary')}
              className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                mode === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => onModeChange?.('diff')}
              className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                mode === 'diff'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Diff
            </button>
            <button
              onClick={() => onModeChange?.('full')}
              className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                mode === 'full'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Full
            </button>
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Collapse
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!preview ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">No changes yet</p>
              <p className="text-xs text-gray-600">
                Spec updates will appear here as you answer questions
              </p>
            </div>
          </div>
        ) : mode === 'summary' ? (
          <SummaryView preview={preview} groupedDiffs={groupedDiffs} />
        ) : mode === 'diff' ? (
          <DiffView
            groupedDiffs={groupedDiffs}
            highlightedDiff={highlightedDiff}
          />
        ) : (
          <FullSpecView preview={preview} />
        )}
      </div>

      {/* Footer */}
      {preview && (
        <div className="border-t border-gray-700 p-3">
          <p className="text-xs text-gray-500">
            Last updated: {new Date(preview.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryView({
  preview,
  groupedDiffs,
}: {
  preview: SpecPreview;
  groupedDiffs: Record<string, SpecDiff[]>;
}) {
  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-green-700 bg-green-900/20 p-3">
          <p className="text-2xl font-bold text-green-300">{preview.summary.added}</p>
          <p className="text-xs text-green-400/80">Added</p>
        </div>
        <div className="rounded-lg border border-amber-700 bg-amber-900/20 p-3">
          <p className="text-2xl font-bold text-amber-300">{preview.summary.modified}</p>
          <p className="text-xs text-amber-400/80">Modified</p>
        </div>
      </div>

      {/* Artifacts by type */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">Artifacts</h4>
        {Object.entries(groupedDiffs).map(([type, diffs]) => (
          <div key={type} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3">
            <span className="text-sm font-medium text-gray-300 capitalize">
              {type.replace('_', ' ')}s
            </span>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
              {diffs.length}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffView({
  groupedDiffs,
  highlightedDiff,
}: {
  groupedDiffs: Record<string, SpecDiff[]>;
  highlightedDiff: string | null;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(groupedDiffs).map(([type, diffs]) => (
        <div key={type} className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-300 capitalize">
            {type.replace('_', ' ')}s
          </h4>

          {diffs.map(diff => (
            <div
              key={diff.id}
              className={`rounded-lg border p-3 transition-all ${
                highlightedDiff === diff.id
                  ? 'border-blue-500 bg-blue-900/20 animate-pulse'
                  : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-white">{diff.id}</span>
                {diff.addedAt && (
                  <span className="rounded bg-green-600/30 px-2 py-0.5 text-xs text-green-300">
                    New
                  </span>
                )}
                {diff.removedAt && (
                  <span className="rounded bg-red-600/30 px-2 py-0.5 text-xs text-red-300">
                    Removed
                  </span>
                )}
              </div>

              {diff.changes.length > 0 && (
                <div className="space-y-1 font-mono text-xs">
                  {diff.changes.map((change, index) => (
                    <div
                      key={index}
                      className={`${
                        change.operation === 'add'
                          ? 'text-green-400'
                          : change.operation === 'remove'
                          ? 'text-red-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {formatFieldChange(change)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {Object.keys(groupedDiffs).length === 0 && (
        <p className="text-center text-sm text-gray-500">No changes to display</p>
      )}
    </div>
  );
}

function FullSpecView({ preview }: { preview: SpecPreview }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Full spec view shows all generated artifacts. This is a simplified view.
      </p>

      {preview.diffs.map(diff => (
        <div key={diff.id} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-300 capitalize">
              {diff.type}
            </span>
            <span className="text-sm font-medium text-white">{diff.id}</span>
          </div>

          <div className="space-y-1 text-xs font-mono text-gray-400">
            {diff.changes.map((change, index) => (
              <div key={index}>
                <span className="text-gray-500">{change.field}:</span>{' '}
                <span className="text-white">{JSON.stringify(change.newValue || change.oldValue)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
