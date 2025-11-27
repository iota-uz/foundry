/**
 * Select component using Headless UI
 */

import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/20/solid';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

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
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={`
              relative w-full px-3 py-2 pr-10
              bg-bg-secondary text-text-primary text-left
              border ${hasError ? 'border-accent-error' : 'border-border-default'}
              rounded-md cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary
              ${hasError ? 'focus:ring-accent-error' : 'focus:ring-border-focus'}
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            <span className={selectedOption ? '' : 'text-text-tertiary'}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDownIcon className="h-5 w-5 text-text-secondary" />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className="
                absolute z-10 mt-1 w-full
                max-h-60 overflow-auto
                bg-bg-secondary border border-border-default
                rounded-md shadow-lg
                focus:outline-none
              "
            >
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-bg-tertiary text-text-primary' : 'text-text-primary'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {option.label}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-primary">
                          <CheckIcon className="h-5 w-5" />
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
      {error && <p className="mt-1.5 text-sm text-accent-error">{error}</p>}
    </div>
  );
}
