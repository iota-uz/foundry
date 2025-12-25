/**
 * Select Component
 *
 * Production-grade dropdown select with Linear/Vercel-inspired styling.
 * Built on Headless UI Listbox for full accessibility.
 * Features:
 * - Smooth dropdown animation
 * - Checkmark for selected item
 * - Keyboard navigation
 * - Error state support
 */

'use client';

import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';

// =============================================================================
// Types
// =============================================================================

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
  /** Label text */
  label?: string;
  /** Placeholder when no selection */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option',
  error,
  disabled = false,
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
        </label>
      )}

      {/* Listbox */}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          {/* Button */}
          <Listbox.Button
            className={`
              relative w-full h-9 pl-3 pr-10
              bg-bg-secondary text-sm text-left
              border rounded-md cursor-pointer
              transition-all duration-150 ease-out
              focus:outline-none focus-visible:ring-1
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-tertiary
              ${hasError
                ? 'border-accent-error focus-visible:ring-accent-error'
                : 'border-border-default hover:border-border-hover focus-visible:ring-accent-primary focus-visible:border-accent-primary'
              }
            `}
          >
            <span className={selectedOption ? 'text-text-primary' : 'text-text-tertiary'}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            </span>
          </Listbox.Button>

          {/* Options dropdown */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className={`
                absolute z-10 mt-1 w-full py-1
                max-h-60 overflow-auto
                bg-bg-secondary border border-border-default
                rounded-md shadow-lg
                focus:outline-none
              `}
            >
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled ?? false}
                  className={({ active, disabled: optDisabled }) => `
                    relative cursor-pointer select-none py-2 pl-9 pr-4 text-sm
                    transition-colors duration-100
                    ${active ? 'bg-bg-hover text-text-primary' : 'text-text-primary'}
                    ${optDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="block text-xs text-text-tertiary truncate mt-0.5">
                          {option.description}
                        </span>
                      )}
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-primary">
                          <CheckIcon className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-sm text-accent-error">{error}</p>
      )}
    </div>
  );
}
