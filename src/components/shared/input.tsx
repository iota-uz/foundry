/**
 * Input component with validation support
 */

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2
            bg-bg-secondary text-text-primary
            border ${hasError ? 'border-accent-error' : 'border-border-default'}
            rounded-md
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary
            ${hasError ? 'focus:ring-accent-error' : 'focus:ring-border-focus'}
            placeholder:text-text-tertiary
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${className}
          `}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={`mt-1.5 text-sm ${
              hasError ? 'text-accent-error' : 'text-text-secondary'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
