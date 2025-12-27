'use client';

/**
 * Recommendation Badge Component
 *
 * Displays AI recommendation with confidence level and reasoning.
 * Updated for current design system with modern minimal dark theme.
 */

import { LightBulbIcon } from '@heroicons/react/24/outline';

interface AIRecommendation {
  confidence: 'high' | 'medium';
  reasoning: string;
}

interface RecommendationBadgeProps {
  recommendation: AIRecommendation;
  onAccept?: () => void;
  className?: string;
}

const confidenceIcons: Record<string, string> = {
  high: '●●●',
  medium: '●●○',
};

export function RecommendationBadge({
  recommendation,
  onAccept,
  className = '',
}: RecommendationBadgeProps) {
  const isHighConfidence = recommendation.confidence === 'high';

  return (
    <div
      className={`rounded-lg border ${
        isHighConfidence
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-border-default bg-bg-tertiary'
      } p-3 ${className}`}
      role="status"
      aria-label={`AI Recommendation: ${recommendation.reasoning}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <LightBulbIcon className="w-5 h-5 flex-shrink-0 text-accent-primary" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                  isHighConfidence
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'bg-bg-elevated text-text-secondary'
                }`}
              >
                AI Recommended
              </span>
              <span className={`text-xs ${isHighConfidence ? 'text-accent-primary' : 'text-text-tertiary'}`}>
                {confidenceIcons[recommendation.confidence]}
              </span>
            </div>

            <p className="mt-2 text-sm text-text-secondary">{recommendation.reasoning}</p>
          </div>
        </div>

        {onAccept && (
          <button
            onClick={onAccept}
            className="flex-shrink-0 rounded bg-accent-primary px-3 py-1 text-xs font-semibold text-white hover:bg-accent-primary-hover transition-colors"
            title="Press 'A' to accept recommendation"
          >
            Accept (A)
          </button>
        )}
      </div>
    </div>
  );
}
