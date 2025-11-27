'use client';

/**
 * Option List Component
 *
 * Displays single or multiple choice options with keyboard support.
 * Used for answer selection in questions.
 */

import { useMemo, useState, useCallback } from 'react';
import type { QuestionOption } from '@/types/ai';

interface OptionListProps {
  options: QuestionOption[];
  selected?: string | string[];
  mode: 'single' | 'multiple';
  onSelect: (optionId: string | string[], isMultiple: boolean) => void;
  onHoverOption?: (optionId: string | null) => void;
  showNumbers?: boolean;
  showIcons?: boolean;
  disabled?: boolean;
}

export function OptionList({
  options,
  mode,
  selected,
  onSelect,
  onHoverOption,
  showNumbers = true,
  showIcons = true,
  disabled = false,
}: OptionListProps) {
  const defaultSelected = mode === 'single' ? '' : [];
  const selectedValue = selected ?? defaultSelected;
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const selectedSet = useMemo(() => {
    if (mode === 'single') {
      return new Set([selectedValue as string].filter(Boolean));
    }
    return new Set(Array.isArray(selectedValue) ? selectedValue : []);
  }, [selectedValue, mode]);

  const handleOptionClick = useCallback(
    (optionId: string) => {
      if (disabled) return;

      if (mode === 'single') {
        onSelect(optionId, false);
      } else {
        const newSelected = Array.from(selectedSet);
        const index = newSelected.indexOf(optionId);
        if (index >= 0) {
          newSelected.splice(index, 1);
        } else {
          newSelected.push(optionId);
        }
        onSelect(newSelected, true);
      }
    },
    [mode, selectedSet, onSelect, disabled]
  );

  const notifyHover = (id: string | null) => {
    if (onHoverOption) {
      onHoverOption(id);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const optionId = options[index].id;

      if (e.key === 'Enter') {
        handleOptionClick(optionId);
      } else if (e.key === 'ArrowDown' && index < options.length - 1) {
        setFocusedIndex(index + 1);
      } else if (e.key === 'ArrowUp' && index > 0) {
        setFocusedIndex(index - 1);
      }
    },
    [options, handleOptionClick]
  );

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const isSelected = selectedSet.has(option.id);
        const isFocused = focusedIndex === index;

        return (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={() => setFocusedIndex(index)}
            onMouseEnter={() => notifyHover(option.id)}
            onMouseLeave={() => notifyHover(null)}
            disabled={disabled}
            className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              isSelected
                ? 'border-blue-600 bg-blue-900/20 ring-1 ring-blue-600'
                : 'border-gray-700 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
            } ${
              isFocused ? 'ring-2 ring-blue-500' : ''
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            aria-pressed={isSelected}
            role={mode === 'single' ? 'radio' : 'checkbox'}
          >
            {/* Checkbox/Radio */}
            <div className="flex-shrink-0 mt-0.5">
              {mode === 'single' ? (
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-600 bg-gray-700'
                  }`}
                >
                  {isSelected && <span className="text-white text-sm">●</span>}
                </div>
              ) : (
                <div
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-600 bg-gray-700'
                  }`}
                >
                  {isSelected && <span className="text-white text-sm font-bold">✓</span>}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {showNumbers && (
                  <span className={`flex-shrink-0 font-mono font-semibold text-xs ${
                    isSelected ? 'text-blue-400' : 'text-gray-500'
                  }`}>
                    [{index + 1}]
                  </span>
                )}
                {showIcons && option.icon && (
                  <span className="flex-shrink-0 text-lg">{option.icon}</span>
                )}
                <span className="font-medium text-white">{option.label}</span>
              </div>

              {option.description && (
                <p className="mt-1 text-sm text-gray-400">{option.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
