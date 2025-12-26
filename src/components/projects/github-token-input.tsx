/**
 * GitHub Token Input Component
 *
 * Secure token input with validation indicator.
 * Features:
 * - Show/hide toggle for token visibility
 * - Real-time validation status indicator
 * - Masked input with monospace font
 * - GitHub-themed styling
 */

'use client';

import React, { useState } from 'react';
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

interface GitHubTokenInputProps {
  value: string;
  onChange: (value: string) => void;
  validationStatus?: 'idle' | 'validating' | 'valid' | 'invalid';
  validationMessage?: string | undefined;
  error?: string | undefined;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function GitHubTokenInput({
  value,
  onChange,
  validationStatus = 'idle',
  validationMessage,
  error,
  disabled,
}: GitHubTokenInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  const hasError = Boolean(error) || validationStatus === 'invalid';

  // Status indicator config
  const statusConfig = {
    idle: null,
    validating: {
      icon: ArrowPathIcon,
      color: 'text-text-tertiary',
      animate: 'animate-spin',
    },
    valid: {
      icon: CheckCircleIcon,
      color: 'text-emerald-400',
      animate: '',
    },
    invalid: {
      icon: XCircleIcon,
      color: 'text-accent-error',
      animate: '',
    },
  };

  const status = statusConfig[validationStatus];

  return (
    <div className="w-full">
      {/* Label */}
      <label className="block text-sm font-medium text-text-primary mb-2">
        GitHub Personal Access Token
      </label>

      {/* Input container */}
      <div className="relative">
        {/* Key icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <KeyIcon className="w-4 h-4 text-text-tertiary" />
        </div>

        {/* Input */}
        <input
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          autoComplete="off"
          spellCheck="false"
          className={`
            w-full h-10 pl-10 pr-20
            bg-bg-secondary text-text-primary
            font-mono text-sm tracking-wide
            border rounded-lg
            placeholder:text-text-tertiary placeholder:font-normal
            transition-all duration-150 ease-out
            focus:outline-none focus:ring-1
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-tertiary
            ${hasError
              ? 'border-accent-error focus:ring-accent-error focus:border-accent-error'
              : 'border-border-default hover:border-border-hover focus:ring-emerald-500 focus:border-emerald-500'
            }
          `}
        />

        {/* Right side: status + visibility toggle */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
          {/* Validation status */}
          {status && (
            <status.icon
              className={`w-4 h-4 ${status.color} ${status.animate}`}
            />
          )}

          {/* Visibility toggle */}
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className={`
              p-1 rounded-md
              text-text-tertiary hover:text-text-secondary
              hover:bg-bg-hover
              transition-colors
            `}
            tabIndex={-1}
          >
            {isVisible ? (
              <EyeSlashIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Helper text / error / validation message */}
      {((error !== undefined && error !== null && error !== '') || (validationMessage !== undefined && validationMessage !== null && validationMessage !== '')) && (
        <p
          className={`mt-2 text-sm ${
            hasError ? 'text-accent-error' : 'text-emerald-400'
          }`}
        >
          {error !== undefined && error !== null && error !== '' ? error : validationMessage}
        </p>
      )}

      {/* Help text when idle */}
      {validationStatus === 'idle' && !(error !== undefined && error !== null && error !== '') && (
        <p className="mt-2 text-xs text-text-tertiary">
          Requires <code className="px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary">repo</code> and{' '}
          <code className="px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary">project</code> scopes
        </p>
      )}
    </div>
  );
}
