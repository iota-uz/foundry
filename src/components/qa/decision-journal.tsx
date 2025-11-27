'use client';

/**
 * Decision Journal Component
 *
 * Timeline of all decisions made during Q&A with undo capabilities.
 * Used in F17 - Decision Journal + Undo Timeline.
 */

import { useState, useMemo } from 'react';
import type { DecisionEntry } from '@/types/ai';

interface DecisionJournalProps {
  entries: DecisionEntry[];
  onUndoTo?: (decisionId: string) => void;
  onUndo?: (decisionId: string) => void;
  filterPhase?: 'cpo' | 'clarify' | 'cto' | 'all';
  filterCategory?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  title?: string;
}

const categoryColors: Record<string, string> = {
  product_scope: 'bg-blue-900/40 text-blue-300 border-blue-700',
  user_experience: 'bg-purple-900/40 text-purple-300 border-purple-700',
  data_model: 'bg-green-900/40 text-green-300 border-green-700',
  api_design: 'bg-amber-900/40 text-amber-300 border-amber-700',
  technology: 'bg-pink-900/40 text-pink-300 border-pink-700',
  security: 'bg-red-900/40 text-red-300 border-red-700',
  performance: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
  integration: 'bg-indigo-900/40 text-indigo-300 border-indigo-700',
};

const phaseColors = {
  cpo: 'bg-blue-600',
  clarify: 'bg-amber-600',
  cto: 'bg-green-600',
};

export function DecisionJournal({
  entries,
  onUndoTo,
  onUndo,
  filterPhase = 'all',
  filterCategory,
  isOpen = true,
  onToggle,
  title = 'Decision Journal',
}: DecisionJournalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewCascade, setPreviewCascade] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterPhase !== 'all' && entry.phase !== filterPhase) return false;
      if (filterCategory && entry.category !== filterCategory) return false;
      return true;
    });
  }, [entries, filterPhase, filterCategory]);

  const cascadeEntries = useMemo(() => {
    if (!previewCascade) return [];
    const startIdx = entries.findIndex((e) => e.id === previewCascade);
    if (startIdx === -1) return [];

    const cascadeGroup = entries[startIdx]?.cascadeGroup;
    if (!cascadeGroup) return [];

    return entries
      .slice(startIdx + 1)
      .filter((e) => e.cascadeGroup === cascadeGroup);
  }, [entries, previewCascade]);

  if (!isOpen) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full gap-2 hover:text-blue-300 transition-colors"
        >
          <div>
            <span className="font-semibold text-gray-300">{title}</span>
            <span className="ml-2 text-xs text-gray-500">({filteredEntries.length})</span>
          </div>
          <span className="text-sm text-gray-500">▶</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/40">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full gap-2 hover:text-blue-300 transition-colors mb-3"
        >
          <span className="font-semibold text-gray-300">{title}</span>
          <span className="text-gray-500">▼</span>
        </button>

        {/* Filters */}
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phase</p>
            <div className="flex gap-1">
              {(['all', 'cpo', 'clarify', 'cto'] as const).map((phase) => (
                <button
                  key={phase}
                  onClick={() => setExpandedId(null)} // Reset expanded on filter change
                  disabled
                  className={`text-xs px-2 py-1 rounded ${
                    filterPhase === phase
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {phase.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-96 overflow-y-auto p-4">
        {filteredEntries.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No decisions yet...</p>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map((entry, idx) => (
              <div key={entry.id}>
                {/* Timeline entry */}
                <button
                  onClick={() =>
                    setExpandedId(expandedId === entry.id ? null : entry.id)
                  }
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-700/40 transition-colors border border-gray-700/50"
                >
                  <div className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
                      <div
                        className={`w-3 h-3 rounded-full border-2 border-gray-600 ${
                          entry.undoneAt
                            ? 'bg-gray-600'
                            : phaseColors[entry.phase]
                        }`}
                      />
                      {idx < filteredEntries.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-700" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start gap-2 flex-wrap mb-1">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-700 text-gray-300">
                          {entry.phase.toUpperCase()}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                            categoryColors[entry.category] || categoryColors.product_scope
                          }`}
                        >
                          {entry.category.replace(/_/g, ' ')}
                        </span>
                        {entry.undoneAt && (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-900/40 text-red-300 border border-red-700">
                            Undone
                          </span>
                        )}
                      </div>

                      {/* Question and answer */}
                      <p className="text-sm font-medium text-white mb-1">
                        {entry.questionText}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Answer:</span>
                        <span className="text-xs font-mono text-gray-400">
                          {Array.isArray(entry.answerGiven)
                            ? entry.answerGiven.join(', ')
                            : String(entry.answerGiven).substring(0, 40)}
                        </span>
                      </div>

                      {/* Recommendation badge */}
                      {entry.aiRecommendation && (
                        <div className="mt-1">
                          <span
                            className={`text-xs font-semibold ${
                              entry.recommendationFollowed
                                ? 'text-green-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {entry.recommendationFollowed
                              ? '✓ Accepted recommendation'
                              : '→ Chose different option'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expandedId === entry.id ? null : entry.id);
                      }}
                      className="flex-shrink-0 text-gray-500 hover:text-gray-300"
                    >
                      {expandedId === entry.id ? '▼' : '▶'}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {expandedId === entry.id && (
                    <div className="mt-3 ml-6 space-y-3 border-t border-gray-700 pt-3">
                      {/* Artifacts affected */}
                      {entry.artifactsAffected.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">
                            Artifacts Affected
                          </p>
                          {entry.artifactsAffected.map((artifact, i) => (
                            <div key={i} className="text-xs text-gray-400 ml-2">
                              <span className="font-mono text-gray-500">
                                {artifact.type}:{artifact.id}
                              </span>
                              {artifact.changes.length > 0 && (
                                <ul className="mt-1 ml-2 space-y-0.5">
                                  {artifact.changes.map((change, j) => (
                                    <li key={j}>▪ {change}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reversibility */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">
                          Change Effort
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            entry.reversibility === 'easy'
                              ? 'text-green-400'
                              : entry.reversibility === 'moderate'
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                        >
                          {entry.reversibility.charAt(0).toUpperCase() +
                            entry.reversibility.slice(1)}
                          {' effort to change later'}
                        </p>
                      </div>

                      {/* Undo button */}
                      {!entry.undoneAt && entry.canUndo && onUndoTo && (
                        <button
                          onClick={() => {
                            setPreviewCascade(entry.id);
                          }}
                          className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                        >
                          Preview undo cascade →
                        </button>
                      )}
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cascade preview modal */}
        {previewCascade && cascadeEntries.length > 0 && (
          <div className="mt-4 rounded border border-blue-700 bg-blue-900/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-blue-300">
                Undoing this decision will also affect:
              </p>
              <button
                onClick={() => setPreviewCascade(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <ul className="space-y-1">
              {cascadeEntries.map((entry) => (
                <li key={entry.id} className="text-xs text-blue-200 flex gap-2">
                  <span className="flex-shrink-0">→</span>
                  <span>{entry.questionText}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                const startEntry = filteredEntries.find(
                  (e) => e.id === previewCascade
                );
                if (startEntry && onUndoTo) {
                  onUndoTo(startEntry.id);
                }
              }}
              className="mt-2 w-full rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Confirm Undo to This Point
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
