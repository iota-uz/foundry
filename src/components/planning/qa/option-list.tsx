'use client';

/**
 * Option List Component
 *
 * Displays single or multiple choice options with keyboard support.
 * Updated for current design system with modern minimal dark theme.
 */

import { useMemo, useState, useCallback } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import type { QuestionOption } from '@/lib/planning/types';

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
      const option = options[index];
      if (!option) return;
      const optionId = option.id;

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
                ? 'border-accent-primary bg-bg-selected ring-1 ring-accent-primary'
                : 'border-border-default bg-bg-secondary hover:border-border-hover hover:bg-bg-hover'
            } ${
              isFocused ? 'ring-2 ring-accent-primary' : ''
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
                      ? 'border-accent-primary bg-accent-primary'
                      : 'border-border-default bg-bg-tertiary'
                  }`}
                >
                  {isSelected && <span className="text-white text-sm">●</span>}
                </div>
              ) : (
                <div
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-accent-primary bg-accent-primary'
                      : 'border-border-default bg-bg-tertiary'
                  }`}
                >
                  {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {showNumbers && (
                  <span className={`flex-shrink-0 font-mono font-semibold text-xs ${
                    isSelected ? 'text-accent-primary' : 'text-text-tertiary'
                  }`}>
                    [{index + 1}]
                  </span>
                )}
                {showIcons && 'icon' in option && typeof (option as { icon?: string }).icon === 'string' && (
                  <span className="flex-shrink-0 text-lg">{(option as { icon: string }).icon}</span>
                )}
                <span className="font-medium text-text-primary">{option.label}</span>
              </div>

              {option.description && (
                <p className="mt-1 text-sm text-text-secondary">{option.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
