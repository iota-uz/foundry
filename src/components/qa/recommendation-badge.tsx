'use client';

/**
 * Recommendation Badge Component
 *
 * Displays AI recommendation with confidence level and source.
 * Used in F16 - AI Recommendation Badges.
 */

import { useMemo } from 'react';
import type { AIRecommendation, RecommendationSource } from '@/types/ai';

interface RecommendationBadgeProps {
  recommendation: AIRecommendation;
  onAccept?: () => void;
  hideSource?: boolean;
  hideReasoning?: boolean;
  className?: string;
}

const sourceLabels: Record<RecommendationSource, string> = {
  constitution: 'Project Constitution',
  best_practice: 'Industry Best Practice',
  context_inference: 'Inferred from your answers',
  majority_usage: 'Commonly chosen',
};

const sourceColors: Record<RecommendationSource, string> = {
  constitution: 'bg-purple-900/40 border-purple-700 text-purple-300',
  best_practice: 'bg-green-900/40 border-green-700 text-green-300',
  context_inference: 'bg-blue-900/40 border-blue-700 text-blue-300',
  majority_usage: 'bg-amber-900/40 border-amber-700 text-amber-300',
};

const confidenceIcons: Record<string, string> = {
  high: '●●●',
  medium: '●●○',
};

export function RecommendationBadge({
  recommendation,
  onAccept,
  hideSource = false,
  hideReasoning = false,
  className = '',
}: RecommendationBadgeProps) {
  const isHighConfidence = recommendation.confidence === 'high';

  const icon = useMemo(() => {
    switch (recommendation.source) {
      case 'constitution':
        return '📋';
      case 'best_practice':
        return '⭐';
      case 'context_inference':
        return '🧠';
      case 'majority_usage':
        return '👥';
      default:
        return '💡';
    }
  }, [recommendation.source]);

  return (
    <div
      className={`rounded-lg border ${
        isHighConfidence
          ? 'border-blue-600 bg-blue-900/20'
          : 'border-gray-600 bg-gray-800/40'
      } p-3 ${className}`}
      role="status"
      aria-label={`AI Recommendation: ${recommendation.reasoning}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <span className="flex-shrink-0 text-lg">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                  isHighConfidence
                    ? 'bg-blue-600/40 text-blue-300'
                    : 'bg-gray-700/40 text-gray-300'
                }`}
              >
                AI Recommended
              </span>
              <span className={`text-xs ${isHighConfidence ? 'text-blue-300' : 'text-gray-400'}`}>
                {confidenceIcons[recommendation.confidence]}
              </span>
              {!hideSource && (
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${sourceColors[recommendation.source]}`}
                >
                  {sourceLabels[recommendation.source]}
                </span>
              )}
            </div>

            {!hideReasoning && (
              <p className="mt-2 text-sm text-gray-300">{recommendation.reasoning}</p>
            )}

            {recommendation.caveats && recommendation.caveats.length > 0 && (
              <div className="mt-2 rounded bg-gray-900/50 p-2">
                <p className="text-xs font-semibold text-gray-400 mb-1">Consider:</p>
                <ul className="text-xs text-gray-400 space-y-0.5">
                  {recommendation.caveats.map((caveat, idx) => (
                    <li key={idx} className="flex gap-1">
                      <span className="flex-shrink-0">•</span>
                      <span>{caveat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {onAccept && (
          <button
            onClick={onAccept}
            className="flex-shrink-0 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            title="Press 'A' to accept recommendation"
          >
            Accept (A)
          </button>
        )}
      </div>
    </div>
  );
}
