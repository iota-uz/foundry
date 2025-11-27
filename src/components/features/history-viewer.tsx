'use client';

/**
 * F3: Per-Artifact History Viewer
 *
 * Shows change timeline for a specific artifact with ability to revert to previous versions.
 */

import { useState, useEffect } from 'react';
import { ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/shared/modal';

export type ArtifactType = 'feature' | 'schema' | 'api' | 'component';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  author: string;
  action: 'created' | 'updated' | 'deleted';
  changes: string[];
  snapshot?: any; // Full artifact state at this point
  commitHash?: string;
}

interface HistoryViewerProps {
  artifactType: ArtifactType;
  artifactId: string;
  projectPath: string;
  isOpen: boolean;
  onClose: () => void;
  onRevert?: (historyId: string) => Promise<void>;
}

export function HistoryViewer({
  artifactType,
  artifactId,
  projectPath,
  isOpen,
  onClose,
  onRevert,
}: HistoryViewerProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, artifactType, artifactId, projectPath]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to fetch history
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectPath)}/history/${artifactType}/${artifactId}`
      );
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (historyId: string) => {
    if (!onRevert) return;

    setReverting(true);
    try {
      await onRevert(historyId);
      await loadHistory(); // Refresh history after revert
      setSelectedEntry(null);
    } catch (error) {
      console.error('Failed to revert:', error);
    } finally {
      setReverting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const getActionColor = (action: HistoryEntry['action']) => {
    switch (action) {
      case 'created':
        return 'text-green-400';
      case 'updated':
        return 'text-blue-400';
      case 'deleted':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="History" size="lg">
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <ClockIcon className="h-5 w-5" />
          <span>
            {artifactType}: <span className="font-mono text-white">{artifactId}</span>
          </span>
        </div>

        {/* Timeline */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-400">Loading history...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No history available for this artifact
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`
                    relative border rounded-lg p-4
                    ${
                      selectedEntry === entry.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700 bg-gray-800/40'
                    }
                    hover:border-gray-600 transition-colors cursor-pointer
                  `}
                  onClick={() => setSelectedEntry(entry.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedEntry(entry.id);
                    }
                  }}
                  aria-label={`History entry: ${entry.action} at ${entry.timestamp}`}
                >
                  {/* Timeline connector */}
                  {idx < history.length - 1 && (
                    <div className="absolute left-7 top-14 h-full w-0.5 bg-gray-700" />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                      entry.action === 'created' ? 'bg-green-500' :
                      entry.action === 'updated' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`} />

                    <div className="flex-1 min-w-0">
                      {/* Action header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold capitalize ${getActionColor(entry.action)}`}>
                            {entry.action}
                          </span>
                          <span className="text-xs text-gray-500">
                            by {entry.author}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>

                      {/* Changes list */}
                      {entry.changes.length > 0 && (
                        <ul className="space-y-1 text-sm text-gray-300">
                          {entry.changes.map((change, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-gray-500">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Commit hash */}
                      {entry.commitHash && (
                        <div className="mt-2 text-xs font-mono text-gray-500">
                          {entry.commitHash.substring(0, 8)}
                        </div>
                      )}

                      {/* Revert button */}
                      {selectedEntry === entry.id && onRevert && idx !== 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevert(entry.id);
                          }}
                          disabled={reverting}
                          className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded
                            bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors"
                          aria-label={`Revert to this version from ${entry.timestamp}`}
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                          {reverting ? 'Reverting...' : 'Revert to this version'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 pt-3 text-xs text-gray-500">
          Showing {history.length} {history.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>
    </Modal>
  );
}
