'use client';

/**
 * Keyboard Hints Component
 *
 * Shows available keyboard shortcuts for power users.
 * Updated for current design system with modern minimal dark theme.
 */

import { useMemo } from 'react';
import type { QuestionType } from '@/lib/planning/types';

interface KeyboardHintsProps {
  questionType: QuestionType;
  optionCount?: number;
  showSkip?: boolean;
  showExplainer?: boolean;
  compact?: boolean;
  visible?: boolean;
}

interface KeyboardHint {
  key: string;
  description?: string;
  context?: string;
}

const KEYBOARD_HINTS: Record<string, KeyboardHint[]> = {
  single_choice: [
    { key: '1-9', description: 'Select option' },
    { key: 'Enter', description: 'Submit answer' },
    { key: 'S', description: 'Skip question' },
    { key: '?', description: 'Toggle explainer' },
  ],
  multiple_choice: [
    { key: '1-9', description: 'Toggle option' },
    { key: 'Enter', description: 'Submit answer' },
    { key: 'S', description: 'Skip question' },
    { key: '?', description: 'Toggle explainer' },
  ],
  text: [
    { key: 'Enter', description: 'Submit answer' },
    { key: 'S', description: 'Skip question' },
    { key: '?', description: 'Toggle explainer' },
  ],
  number: [
    { key: 'Enter', description: 'Submit answer' },
    { key: 'S', description: 'Skip question' },
    { key: '?', description: 'Toggle explainer' },
  ],
  code: [
    { key: 'Tab', description: 'Indent' },
    { key: 'Enter', description: 'Submit answer' },
    { key: 'S', description: 'Skip question' },
  ],
};

export function KeyboardHints({
  questionType,
  optionCount = 0,
  showSkip = true,
  showExplainer = true,
  compact = false,
  visible = true,
}: KeyboardHintsProps) {
  const hints = useMemo(() => {
    let baseHints = KEYBOARD_HINTS[questionType] || [];

    // Filter out options based on availability
    if (!showSkip) {
      baseHints = baseHints.filter((h) => h.key !== 'S');
    }

    if (!showExplainer) {
      baseHints = baseHints.filter((h) => h.key !== '?');
    }

    // Limit number-based hints to actual option count
    if (optionCount > 0 && (questionType === 'single_choice' || questionType === 'multiple_choice')) {
      const firstHint = baseHints.findIndex((h) => h.key.startsWith('1'));
      if (firstHint >= 0) {
        const newKey = optionCount <= 9 ? `1-${optionCount}` : '1-9';
        baseHints[firstHint] = { ...baseHints[firstHint], key: newKey };
      }
    }

    return baseHints;
  }, [questionType, optionCount, showSkip, showExplainer]);

  if (!visible || hints.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {hints.map((hint, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1 rounded bg-bg-tertiary px-2 py-1 text-xs text-text-tertiary"
          >
            <kbd className="font-mono font-semibold text-accent-primary">{hint.key}</kbd>
            <span>{hint.description}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-t border-border-default pt-3 mt-4">
      <p className="mb-2 text-xs font-semibold uppercase text-text-tertiary">Keyboard Shortcuts</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {hints.map((hint, index) => (
          <div key={index} className="flex items-start gap-2">
            <kbd className="flex-shrink-0 rounded bg-bg-tertiary px-2 py-1 font-mono font-semibold text-accent-primary">
              {hint.key}
            </kbd>
            <span className="text-text-tertiary">
              {hint.description}
              {hint.context && <span className="text-text-muted"> ({hint.context})</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
