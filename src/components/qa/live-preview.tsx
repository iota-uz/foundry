'use client';

/**
 * Live Spec Preview Component
 *
 * Shows real-time spec updates as answers are provided.
 * Used in F15 - Live Spec Preview Panel.
 */

import { useMemo } from 'react';
import type { SpecUpdate, SpecChange } from '@/types/ai';

interface LivePreviewProps {
  updates: SpecUpdate[];
  pendingChanges?: SpecChange[];
  diffMode?: 'unified' | 'split' | 'highlight';
  isOpen?: boolean;
  onToggle?: () => void;
  title?: string;
}

export function LivePreview({
  updates,
  pendingChanges = [],
  isOpen = true,
  onToggle,
  title = 'Live Spec Preview',
}: LivePreviewProps) {
  const groupedUpdates = useMemo(() => {
    const grouped: Record<string, SpecUpdate[]> = {};
    updates.forEach((update) => {
      if (!grouped[update.artifactType]) {
        grouped[update.artifactType] = [];
      }
      grouped[update.artifactType]?.push(update);
    });
    return grouped;
  }, [updates]);

  const stats = useMemo(() => {
    return {
      total: updates.length,
      added: updates.filter((u) => u.type === 'add').length,
      modified: updates.filter((u) => u.type === 'modify').length,
      removed: updates.filter((u) => u.type === 'remove').length,
    };
  }, [updates]);

  if (!isOpen) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full gap-2 hover:text-blue-300 transition-colors"
        >
          <span className="font-semibold text-gray-300">{title}</span>
          <span className="text-sm text-gray-500">▶</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/40">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            onClick={onToggle}
            className="flex items-center justify-between flex-1 gap-2 hover:text-blue-300 transition-colors text-left"
          >
            <span className="font-semibold text-gray-300">{title}</span>
            <span className="text-gray-500">▼</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="rounded bg-gray-900 p-2">
            <p className="text-gray-500">Total</p>
            <p className="text-lg font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded bg-green-900/30 p-2">
            <p className="text-green-500">Added</p>
            <p className="text-lg font-bold text-green-400">{stats.added}</p>
          </div>
          <div className="rounded bg-yellow-900/30 p-2">
            <p className="text-yellow-500">Modified</p>
            <p className="text-lg font-bold text-yellow-400">{stats.modified}</p>
          </div>
          <div className="rounded bg-red-900/30 p-2">
            <p className="text-red-500">Removed</p>
            <p className="text-lg font-bold text-red-400">{stats.removed}</p>
          </div>
        </div>
      </div>

      {/* Updates list */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {updates.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No changes yet...</p>
        ) : (
          Object.entries(groupedUpdates).map(([artifactType, typeUpdates]) => (
            <div key={artifactType}>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                {artifactType}
              </h4>
              <div className="space-y-2">
                {typeUpdates.map((update) => (
                  <div
                    key={update.id}
                    className={`rounded border p-2 text-sm ${
                      update.type === 'add'
                        ? 'border-green-700/50 bg-green-900/20'
                        : update.type === 'modify'
                        ? 'border-yellow-700/50 bg-yellow-900/20'
                        : 'border-red-700/50 bg-red-900/20 line-through'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`flex-shrink-0 font-bold ${
                          update.type === 'add'
                            ? 'text-green-400'
                            : update.type === 'modify'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {update.type === 'add' ? '+' : update.type === 'modify' ? '~' : '−'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-gray-300 break-all">
                          {update.section} {update.path && `→ ${update.path}`}
                        </p>
                        {update.newValue !== undefined && (
                          <p className="mt-1 text-xs text-gray-400">
                            Value: {JSON.stringify(update.newValue).substring(0, 60)}
                            {JSON.stringify(update.newValue).length > 60 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Pending changes */}
        {pendingChanges.length > 0 && (
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Pending Changes
            </h4>
            <div className="space-y-2">
              {pendingChanges.map((change, idx) => (
                <div
                  key={idx}
                  className="rounded border border-gray-600 border-dashed bg-gray-900/40 p-2 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-gray-500">~</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-gray-300 break-all">
                        {change.path}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {change.operation === 'add' && 'Waiting to add'}
                        {change.operation === 'update' && 'Waiting to update'}
                        {change.operation === 'delete' && 'Waiting to remove'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
