'use client';

/**
 * Explainer Component
 *
 * Expandable "Why this question?" context explaining relevance and impact.
 * Used in F19 - "Why This Question?" Explainers.
 */

import type { QuestionExplainer } from '@/types/ai';

interface ExplainerProps {
  explainer: QuestionExplainer;
  expanded?: boolean | undefined;
  onToggle?: (() => void) | undefined;
}

export function Explainer({
  explainer,
  expanded = false,
  onToggle,
}: ExplainerProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left hover:text-blue-300 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">❓</span>
          <span className="font-semibold text-gray-300">Why this question?</span>
        </div>
        <span className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Content */}
      {expanded && (
        <div className="mt-4 space-y-4 text-sm">
          {/* Connection */}
          <div>
            <p className="font-semibold text-gray-300 mb-1">Connection</p>
            <p className="text-gray-400">{explainer.connection}</p>
          </div>

          {/* Purpose */}
          <div>
            <p className="font-semibold text-gray-300 mb-1">Purpose</p>
            <p className="text-gray-400">{explainer.purpose}</p>
          </div>

          {/* Downstream impact */}
          <div>
            <p className="font-semibold text-gray-300 mb-2">Downstream Impact</p>
            <div className="grid gap-3">
              {explainer.downstream.schemaImpact.length > 0 && (
                <div className="rounded bg-gray-900/40 p-2">
                  <p className="text-xs font-semibold text-blue-300 mb-1">Database Schema</p>
                  <ul className="space-y-1">
                    {explainer.downstream.schemaImpact.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-gray-400">
                        <span className="flex-shrink-0">▪</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {explainer.downstream.apiImpact.length > 0 && (
                <div className="rounded bg-gray-900/40 p-2">
                  <p className="text-xs font-semibold text-green-300 mb-1">API Endpoints</p>
                  <ul className="space-y-1">
                    {explainer.downstream.apiImpact.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-gray-400">
                        <span className="flex-shrink-0">▪</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {explainer.downstream.componentImpact.length > 0 && (
                <div className="rounded bg-gray-900/40 p-2">
                  <p className="text-xs font-semibold text-purple-300 mb-1">UI Components</p>
                  <ul className="space-y-1">
                    {explainer.downstream.componentImpact.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-gray-400">
                        <span className="flex-shrink-0">▪</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Example */}
          {explainer.example && (
            <div>
              <p className="font-semibold text-gray-300 mb-2">Example</p>
              <div className="space-y-2 rounded bg-gray-900/40 p-2">
                <div>
                  <p className="text-xs text-gray-500">If you choose</p>
                  <p className="text-gray-300">"{explainer.example.ifYouChoose}"</p>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <p className="text-xs text-gray-500">Then spec will have</p>
                  <p className="text-gray-300">{explainer.example.thenSpecWillHave}</p>
                </div>
              </div>
            </div>
          )}

          {/* Related answer */}
          {explainer.relatedAnswer && (
            <div className="rounded border border-blue-700/30 bg-blue-900/20 p-2">
              <p className="text-xs font-semibold text-blue-300 mb-1">Related Decision</p>
              <p className="text-sm text-blue-200">{explainer.relatedAnswer.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
