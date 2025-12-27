'use client';

/**
 * Text Input Component
 *
 * Text input field with validation.
 * Updated for current design system with modern minimal dark theme.
 */

import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message: string;
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  validation?: ValidationRule;
  multiline?: boolean;
  maxLength?: number;
  rows?: number;
  showCharCount?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Enter your answer...',
  validation,
  multiline = false,
  maxLength,
  rows = 3,
  showCharCount = false,
  disabled = false,
  autoFocus = true,
}: TextInputProps) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateInput = useCallback(
    (val: string) => {
      if (!validation) {
        setError(null);
        return true;
      }

      if (validation.required && !val.trim()) {
        setError(validation.message);
        return false;
      }

      if (validation.minLength && val.length < validation.minLength) {
        setError(
          `Minimum ${validation.minLength} characters required (${validation.message})`
        );
        return false;
      }

      if (validation.maxLength && val.length > validation.maxLength) {
        setError(
          `Maximum ${validation.maxLength} characters allowed (${validation.message})`
        );
        return false;
      }

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(val)) {
          setError(validation.message);
          return false;
        }
      }

      setError(null);
      return true;
    },
    [validation]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (touched) {
        validateInput(newValue);
      }
    },
    [onChange, touched, validateInput]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    validateInput(value);
  }, [value, validateInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !multiline && onSubmit) {
        e.preventDefault();
        if (validateInput(value)) {
          onSubmit();
        }
      }
    },
    [multiline, onSubmit, value, validateInput]
  );

  const charCount = value.length;
  const charLimit = maxLength || validation?.maxLength;

  const InputElement = multiline ? 'textarea' : 'input';

  return (
    <div className="w-full">
      <div className="relative">
        <InputElement
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength || validation?.maxLength}
          {...(multiline && { rows })}
          className={`w-full rounded-lg border bg-bg-secondary px-4 py-2 text-text-primary placeholder-text-muted transition-colors focus:outline-none ${
            error
              ? 'border-accent-error focus:border-accent-error focus:ring-1 focus:ring-accent-error'
              : 'border-border-default focus:border-border-focus focus:ring-1 focus:ring-border-focus'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        />
      </div>

      {/* Error message */}
      {error && touched && (
        <p className="mt-2 text-sm text-accent-error" role="alert">
          {error}
        </p>
      )}

      {/* Character count */}
      {showCharCount && charLimit && (
        <div className="mt-2 flex justify-end text-xs text-text-tertiary">
          <span className={charCount > charLimit * 0.9 ? 'text-accent-warning' : ''}>
            {charCount} / {charLimit}
          </span>
        </div>
      )}

      {/* Helper text */}
      {validation?.message && !error && (
        <p className="mt-2 text-xs text-text-secondary">{validation.message}</p>
      )}
    </div>
  );
}
