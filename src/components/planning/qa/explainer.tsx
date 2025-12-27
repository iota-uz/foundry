'use client';

/**
 * Explainer Component
 *
 * Expandable "Why this question?" context explaining relevance and impact.
 * Updated for current design system with modern minimal dark theme.
 */

interface QuestionExplainer {
  whyAsking: string;
  context?: string;
}

interface ExplainerProps {
  explainer: QuestionExplainer;
  expanded?: boolean;
  onToggle?: () => void;
}

export function Explainer({
  explainer,
  expanded = false,
  onToggle,
}: ExplainerProps) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-tertiary p-4">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left hover:text-accent-primary transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">❓</span>
          <span className="font-semibold text-text-secondary">Why this question?</span>
        </div>
        <span className={`text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Content */}
      {expanded && (
        <div className="mt-4 space-y-3 text-sm">
          {/* Why asking */}
          <div>
            <p className="font-semibold text-text-secondary mb-1">Purpose</p>
            <p className="text-text-tertiary">{explainer.whyAsking}</p>
          </div>

          {/* Context */}
          {explainer.context && (
            <div>
              <p className="font-semibold text-text-secondary mb-1">Context</p>
              <p className="text-text-tertiary">{explainer.context}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
