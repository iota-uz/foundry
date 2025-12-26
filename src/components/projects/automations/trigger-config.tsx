/**
 * Trigger Config Component
 *
 * Configure automation trigger (status_enter or manual).
 * Features:
 * - Trigger type selection
 * - Status selector for status triggers
 * - Button label input for manual triggers
 * - Visual preview of the trigger
 */

'use client';

import React from 'react';
import { BoltIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/shared';

// ============================================================================
// Types
// ============================================================================

interface TriggerConfigProps {
  triggerType: 'status_enter' | 'manual';
  triggerStatus: string;
  buttonLabel: string;
  availableStatuses: string[];
  statusesLoading?: boolean | undefined;
  statusesError?: string | null | undefined;
  onTriggerTypeChange: (type: 'status_enter' | 'manual') => void;
  onTriggerStatusChange: (status: string) => void;
  onButtonLabelChange: (label: string) => void;
  errors?: {
    triggerStatus?: string | undefined;
    buttonLabel?: string | undefined;
  } | undefined;
}

// ============================================================================
// Component
// ============================================================================

export function TriggerConfig({
  triggerType,
  triggerStatus,
  buttonLabel,
  availableStatuses,
  statusesLoading,
  statusesError,
  onTriggerTypeChange,
  onTriggerStatusChange,
  onButtonLabelChange,
  errors,
}: TriggerConfigProps) {
  return (
    <div className="space-y-4">
      {/* Trigger type selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Trigger Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Status Enter */}
          <button
            type="button"
            onClick={() => onTriggerTypeChange('status_enter')}
            className={`
              relative flex flex-col items-center gap-2 p-4 rounded-xl
              border transition-all duration-200
              ${triggerType === 'status_enter'
                ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
                : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-border-hover'
              }
            `}
          >
            <BoltIcon className="w-6 h-6" />
            <span className="text-sm font-medium">On Status Enter</span>
            <span className="text-[10px] font-mono opacity-70">
              Triggers when issue enters status
            </span>

            {/* Selection indicator */}
            {triggerType === 'status_enter' && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400" />
            )}
          </button>

          {/* Manual */}
          <button
            type="button"
            onClick={() => onTriggerTypeChange('manual')}
            className={`
              relative flex flex-col items-center gap-2 p-4 rounded-xl
              border transition-all duration-200
              ${triggerType === 'manual'
                ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-border-hover'
              }
            `}
          >
            <PlayIcon className="w-6 h-6" />
            <span className="text-sm font-medium">Manual Button</span>
            <span className="text-[10px] font-mono opacity-70">
              User clicks to trigger workflow
            </span>

            {/* Selection indicator */}
            {triggerType === 'manual' && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400" />
            )}
          </button>
        </div>
      </div>

      {/* Status selector (for status_enter) */}
      {triggerType === 'status_enter' && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Status Column
          </label>
          {/* Loading state */}
          {statusesLoading === true && (
            <div className="flex items-center gap-2 h-10 px-3 bg-bg-secondary border border-border-default rounded-lg">
              <svg className="w-4 h-4 animate-spin text-text-tertiary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-text-tertiary">Loading statuses...</span>
            </div>
          )}
          {/* Error state */}
          {statusesLoading !== true && statusesError != null && statusesError !== '' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{statusesError}</p>
            </div>
          )}
          {/* Normal state */}
          {statusesLoading !== true && (statusesError == null || statusesError === '') && (
            <div className="relative">
              <select
                value={triggerStatus}
                onChange={(e) => onTriggerStatusChange(e.target.value)}
                className={`
                  w-full h-10 px-3 pr-10
                  bg-bg-secondary text-text-primary text-sm
                  font-mono
                  border rounded-lg
                  appearance-none
                  transition-all duration-150 ease-out
                  focus:outline-none focus:ring-1
                  ${errors?.triggerStatus !== undefined && errors.triggerStatus !== ''
                    ? 'border-accent-error focus:ring-accent-error focus:border-accent-error'
                    : 'border-border-default hover:border-border-hover focus:ring-yellow-500 focus:border-yellow-500'
                  }
                `}
              >
                <option value="">Select a status...</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          {errors?.triggerStatus !== undefined && errors.triggerStatus !== '' && (
            <p className="mt-1.5 text-sm text-accent-error">{errors.triggerStatus}</p>
          )}
          {statusesLoading !== true && (statusesError == null || statusesError === '') && (
            <p className="mt-1.5 text-xs text-text-tertiary">
              Workflow runs when an issue is moved to this status
            </p>
          )}
        </div>
      )}

      {/* Button label (for manual) */}
      {triggerType === 'manual' && (
        <div>
          <Input
            label="Button Label"
            value={buttonLabel}
            onChange={(e) => onButtonLabelChange(e.target.value)}
            placeholder="Run Planning..."
            error={errors?.buttonLabel}
            helperText="Label shown on the trigger button in the issue view"
            maxLength={50}
            showCount
          />
        </div>
      )}

      {/* Preview */}
      <div className="pt-2">
        <div className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider mb-2">
          Preview
        </div>
        <div className="p-4 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
          {triggerType === 'status_enter' ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                <BoltIcon className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <div className="text-xs text-text-tertiary">When issue enters</div>
                <div className="text-sm font-medium text-text-primary font-mono">
                  {triggerStatus || '(select status)'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled
                className={`
                  inline-flex items-center gap-2
                  px-3 py-1.5 rounded-lg
                  bg-purple-500/10 border border-purple-500/30
                  text-purple-400 text-sm font-medium
                  cursor-not-allowed
                `}
              >
                <PlayIcon className="w-4 h-4" />
                {buttonLabel || 'Run Workflow'}
              </button>
              <span className="text-xs text-text-muted">
                Button appears on issue cards
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
