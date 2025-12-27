'use client';

/**
 * Live Preview Component
 *
 * Shows real-time updates as answers are provided (simplified for MVP).
 * Updated for current design system with modern minimal dark theme.
 */

import { useMemo } from 'react';

interface SpecUpdate {
  id: string;
  type: 'add' | 'modify' | 'remove';
  section: string;
  path: string;
  newValue?: unknown;
  timestamp: string;
  artifactType: 'schema' | 'api' | 'component' | 'feature';
}

interface LivePreviewProps {
  updates: SpecUpdate[];
  isOpen?: boolean;
  onToggle?: () => void;
  title?: string;
}

export function LivePreview({
  updates,
  isOpen = true,
  onToggle,
  title = 'Live Preview',
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
      <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full gap-2 hover:text-accent-primary transition-colors"
        >
          <span className="font-semibold text-text-secondary">{title}</span>
          <span className="text-sm text-text-tertiary">▶</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary">
      {/* Header */}
      <div className="border-b border-border-default p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            onClick={onToggle}
            className="flex items-center justify-between flex-1 gap-2 hover:text-accent-primary transition-colors text-left"
          >
            <span className="font-semibold text-text-secondary">{title}</span>
            <span className="text-text-tertiary">▼</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="rounded bg-bg-tertiary p-2">
            <p className="text-text-tertiary">Total</p>
            <p className="text-lg font-bold text-text-primary">{stats.total}</p>
          </div>
          <div className="rounded bg-accent-success-dim p-2">
            <p className="text-accent-success">Added</p>
            <p className="text-lg font-bold text-accent-success">{stats.added}</p>
          </div>
          <div className="rounded bg-accent-warning-dim p-2">
            <p className="text-accent-warning">Modified</p>
            <p className="text-lg font-bold text-accent-warning">{stats.modified}</p>
          </div>
          <div className="rounded bg-accent-error-dim p-2">
            <p className="text-accent-error">Removed</p>
            <p className="text-lg font-bold text-accent-error">{stats.removed}</p>
          </div>
        </div>
      </div>

      {/* Updates list */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {updates.length === 0 ? (
          <p className="text-sm text-text-tertiary italic">No changes yet...</p>
        ) : (
          Object.entries(groupedUpdates).map(([artifactType, typeUpdates]) => (
            <div key={artifactType}>
              <h4 className="text-xs font-semibold text-text-tertiary uppercase mb-2">
                {artifactType}
              </h4>
              <div className="space-y-2">
                {typeUpdates.map((update) => (
                  <div
                    key={update.id}
                    className={`rounded border p-2 text-sm ${
                      update.type === 'add'
                        ? 'border-accent-success/30 bg-accent-success-dim'
                        : update.type === 'modify'
                        ? 'border-accent-warning/30 bg-accent-warning-dim'
                        : 'border-accent-error/30 bg-accent-error-dim line-through'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`flex-shrink-0 font-bold ${
                          update.type === 'add'
                            ? 'text-accent-success'
                            : update.type === 'modify'
                            ? 'text-accent-warning'
                            : 'text-accent-error'
                        }`}
                      >
                        {update.type === 'add' ? '+' : update.type === 'modify' ? '~' : '−'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-text-secondary break-all">
                          {update.section} {update.path && `→ ${update.path}`}
                        </p>
                        {update.newValue !== undefined && (
                          <p className="mt-1 text-xs text-text-tertiary">
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
      </div>
    </div>
  );
}
