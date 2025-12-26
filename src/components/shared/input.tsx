/**
 * Input Component
 *
 * Production-grade text input with Linear/Vercel-inspired styling.
 * Features:
 * - Consistent h-9 height
 * - Left/right icon slots
 * - Error state with red border
 * - Helper text support
 * - Optional character counter
 * - Accessible focus states
 */

'use client';

import React from 'react';

// =============================================================================
// Types
// =============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string | undefined;
  /** Helper text (shown when no error) */
  helperText?: string | undefined;
  /** Icon on the left side */
  leftIcon?: React.ReactNode;
  /** Icon on the right side */
  rightIcon?: React.ReactNode;
  /** Show character counter (requires maxLength) */
  showCount?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      showCount,
      maxLength,
      className = '',
      value,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {/* Label row */}
        {((label !== undefined && label !== null && label !== '') || (showCount === true && maxLength !== undefined)) && (
          <div className="flex items-center justify-between mb-2">
            {label !== undefined && label !== null && label !== '' && (
              <label className="block text-sm font-medium text-text-primary">
                {label}
              </label>
            )}
            {showCount === true && maxLength !== undefined && maxLength !== null && maxLength !== 0 && (
              <span className="text-xs text-text-tertiary tabular-nums">
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon !== undefined && leftIcon !== null && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-text-tertiary">{leftIcon}</span>
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            value={value}
            maxLength={maxLength}
            className={`
              w-full h-9 px-3
              bg-bg-secondary text-text-primary text-sm
              border rounded-md
              placeholder:text-text-tertiary
              transition-all duration-150 ease-out
              focus:outline-none focus:ring-1
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-tertiary
              ${hasError
                ? 'border-accent-error focus:ring-accent-error focus:border-accent-error'
                : 'border-border-default hover:border-border-hover focus:ring-accent-primary focus:border-accent-primary'
              }
              ${leftIcon !== undefined && leftIcon !== null ? 'pl-10' : ''}
              ${rightIcon !== undefined && rightIcon !== null ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />

          {/* Right icon */}
          {rightIcon !== undefined && rightIcon !== null && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-text-tertiary">{rightIcon}</span>
            </div>
          )}
        </div>

        {/* Error or helper text */}
        {((error !== undefined && error !== null && error !== '') || (helperText !== undefined && helperText !== null && helperText !== '')) && (
          <p
            className={`mt-1.5 text-sm ${
              hasError ? 'text-accent-error' : 'text-text-secondary'
            }`}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
