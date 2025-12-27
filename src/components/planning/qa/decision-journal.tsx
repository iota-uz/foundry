'use client';

/**
 * Decision Journal Component (Simplified for MVP)
 *
 * Timeline of key decisions made during planning.
 * Updated for current design system with modern minimal dark theme.
 * Removed undo functionality for MVP - keeping it simple.
 */

import { useState } from 'react';

interface DecisionEntry {
  id: string;
  questionText: string;
  answerGiven: unknown;
  category: string;
  phase: string;
  createdAt: string;
}

interface DecisionJournalProps {
  entries: DecisionEntry[];
  isOpen?: boolean;
  onToggle?: () => void;
  title?: string;
}

const categoryColors: Record<string, string> = {
  product_scope: 'bg-accent-primary/20 text-accent-primary border-accent-primary/30',
  user_experience: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  data_model: 'bg-accent-success/20 text-accent-success border-accent-success/30',
  api_design: 'bg-accent-warning/20 text-accent-warning border-accent-warning/30',
  technology: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  security: 'bg-accent-error/20 text-accent-error border-accent-error/30',
  performance: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  integration: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

const phaseColors: Record<string, string> = {
  planning: 'bg-accent-primary',
  design: 'bg-accent-warning',
  implementation: 'bg-accent-success',
};

export function DecisionJournal({
  entries,
  isOpen = true,
  onToggle,
  title = 'Decision Journal',
}: DecisionJournalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full gap-2 hover:text-accent-primary transition-colors"
        >
          <div>
            <span className="font-semibold text-text-secondary">{title}</span>
            <span className="ml-2 text-xs text-text-tertiary">({entries.length})</span>
          </div>
          <span className="text-sm text-text-tertiary">▶</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary">
      {/* Header */}
      <div className="border-b border-border-default p-4">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full gap-2 hover:text-accent-primary transition-colors mb-3"
        >
          <span className="font-semibold text-text-secondary">{title}</span>
          <span className="text-text-tertiary">▼</span>
        </button>
      </div>

      {/* Timeline */}
      <div className="max-h-96 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <p className="text-sm text-text-tertiary italic">No decisions yet...</p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, idx) => (
              <div key={entry.id}>
                {/* Timeline entry */}
                <button
                  onClick={() =>
                    setExpandedId(expandedId === entry.id ? null : entry.id)
                  }
                  className="w-full text-left p-3 rounded-lg hover:bg-bg-hover transition-colors border border-border-subtle"
                >
                  <div className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
                      <div
                        className={`w-3 h-3 rounded-full border-2 border-border-default ${
                          phaseColors[entry.phase] || 'bg-bg-elevated'
                        }`}
                      />
                      {idx < entries.length - 1 && (
                        <div className="w-0.5 h-8 bg-border-default" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start gap-2 flex-wrap mb-1">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-bg-elevated text-text-secondary">
                          {entry.phase.toUpperCase()}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                            categoryColors[entry.category] || categoryColors.product_scope
                          }`}
                        >
                          {entry.category.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Question and answer */}
                      <p className="text-sm font-medium text-text-primary mb-1">
                        {entry.questionText}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">Answer:</span>
                        <span className="text-xs font-mono text-text-secondary">
                          {Array.isArray(entry.answerGiven)
                            ? entry.answerGiven.join(', ')
                            : String(entry.answerGiven).substring(0, 40)}
                        </span>
                      </div>
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expandedId === entry.id ? null : entry.id);
                      }}
                      className="flex-shrink-0 text-text-tertiary hover:text-text-secondary"
                    >
                      {expandedId === entry.id ? '▼' : '▶'}
                    </button>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
