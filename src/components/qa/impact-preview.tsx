'use client';

/**
 * Impact Preview Component
 *
 * Popover showing potential impacts when hovering over an option.
 * Used in F18 - Impact Preview on Hover.
 */

import { useEffect, useRef, useState } from 'react';
import type { ImpactPreview } from '@/types/ai';

interface ImpactPopoverProps {
  impact: ImpactPreview | null;
  visible: boolean;
  position?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  onDismiss?: () => void;
}

export function ImpactPopover({
  impact,
  visible,
  position = {},
  onDismiss,
}: ImpactPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>(position);

  useEffect(() => {
    if (!visible || !popoverRef.current || !position.top) return;

    // Adjust position to prevent overflow
    const rect = popoverRef.current.getBoundingClientRect();
    const newPosition = { ...position };

    // Check if goes off bottom
    if (position.top && position.top + rect.height > window.innerHeight) {
      delete newPosition.top;
      newPosition.bottom = window.innerHeight - (position.top || 0);
    }

    // Check if goes off right
    if (position.left && position.left + rect.width > window.innerWidth) {
      delete newPosition.left;
      newPosition.right = window.innerWidth - (position.left || 0) - 16;
    }

    setPopoverPosition(newPosition);
  }, [visible, position]);

  if (!visible || !impact) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 rounded-lg border border-blue-700 bg-blue-950/95 p-4 shadow-2xl backdrop-blur-sm"
      style={{
        width: '320px',
        maxHeight: '280px',
        overflow: 'auto',
        ...popoverPosition,
      }}
      role="tooltip"
      aria-label="Impact preview"
    >
      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>

      <div className="space-y-4 pr-6">
        {/* Summary */}
        <div>
          <p className="text-xs font-semibold text-blue-300 uppercase">Impact Summary</p>
          <p className="mt-1 text-sm text-blue-100">{impact.summary}</p>
        </div>

        {/* Spec changes */}
        {impact.specChanges.sections.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-300 uppercase">Spec Changes</p>
            <ul className="mt-1 space-y-1">
              {impact.specChanges.sections.map((section, idx) => (
                <li key={idx} className="text-xs text-green-100 flex gap-2">
                  <span className="flex-shrink-0">▪</span>
                  <span>{section}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-green-200">
              ~{impact.specChanges.estimatedFields} fields affected
            </p>
          </div>
        )}

        {/* Additional questions */}
        {impact.additionalQuestions.estimate > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-300 uppercase">
              More Questions Coming
            </p>
            <p className="mt-1 text-xs text-amber-100">
              ~{impact.additionalQuestions.estimate} more questions on:{' '}
              {impact.additionalQuestions.topics.join(', ')}
            </p>
          </div>
        )}

        {/* Reversibility */}
        <div>
          <p className="text-xs font-semibold text-gray-300 uppercase">
            Can Change Later?
          </p>
          <p
            className={`mt-1 text-xs font-semibold ${
              impact.reversibility === 'easy'
                ? 'text-green-300'
                : impact.reversibility === 'moderate'
                ? 'text-amber-300'
                : 'text-red-300'
            }`}
          >
            {impact.reversibility.charAt(0).toUpperCase() + impact.reversibility.slice(1)}
          </p>
        </div>

        {/* Pros/Cons */}
        {(impact.pros.length > 0 || impact.cons.length > 0) && (
          <div className="rounded bg-blue-900/40 p-2">
            {impact.pros.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-green-300">✓ Advantages</p>
                <ul className="mt-1 space-y-1">
                  {impact.pros.map((pro, idx) => (
                    <li key={idx} className="text-xs text-gray-200 flex gap-2">
                      <span className="flex-shrink-0">+</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {impact.cons.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-300">✕ Trade-offs</p>
                <ul className="mt-1 space-y-1">
                  {impact.cons.map((con, idx) => (
                    <li key={idx} className="text-xs text-gray-200 flex gap-2">
                      <span className="flex-shrink-0">-</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Dependencies */}
        {(impact.dependencies.creates.length > 0 || impact.dependencies.removes.length > 0) && (
          <div>
            {impact.dependencies.creates.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-300">Creates Dependencies</p>
                <ul className="mt-1 space-y-1">
                  {impact.dependencies.creates.map((dep, idx) => (
                    <li key={idx} className="text-xs text-gray-300 flex gap-2">
                      <span className="flex-shrink-0">→</span>
                      <span>{dep}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {impact.dependencies.removes.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-amber-300">Removes Dependencies</p>
                <ul className="mt-1 space-y-1">
                  {impact.dependencies.removes.map((dep, idx) => (
                    <li key={idx} className="text-xs text-gray-300 flex gap-2">
                      <span className="flex-shrink-0">←</span>
                      <span>{dep}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
