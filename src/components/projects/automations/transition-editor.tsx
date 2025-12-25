/**
 * Transition Editor Component
 *
 * Inline editor for creating/editing status transitions.
 * Features:
 * - Condition selector
 * - Custom expression input
 * - Next status selector
 */

'use client';

import React from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

interface TransitionEditorProps {
  condition: 'success' | 'failure' | 'custom';
  customExpression: string;
  nextStatus: string;
  availableStatuses: string[];
  onConditionChange: (condition: 'success' | 'failure' | 'custom') => void;
  onCustomExpressionChange: (expression: string) => void;
  onNextStatusChange: (status: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  errors?: {
    condition?: string;
    customExpression?: string;
    nextStatus?: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export function TransitionEditor({
  condition,
  customExpression,
  nextStatus,
  availableStatuses,
  onConditionChange,
  onCustomExpressionChange,
  onNextStatusChange,
  onSave,
  onCancel,
  isSaving,
  errors,
}: TransitionEditorProps) {
  return (
    <div className="p-4 bg-bg-secondary rounded-lg border border-border-default space-y-4">
      {/* Condition row */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-text-tertiary uppercase w-16">When</span>
        <div className="flex-1 flex gap-2">
          {(['success', 'failure', 'custom'] as const).map((cond) => (
            <button
              key={cond}
              type="button"
              onClick={() => onConditionChange(cond)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-mono font-medium
                transition-all duration-150
                ${condition === cond
                  ? cond === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : cond === 'failure'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                  : 'bg-bg-tertiary text-text-secondary border border-transparent hover:border-border-hover'
                }
              `}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      {/* Custom expression (when custom is selected) */}
      {condition === 'custom' && (
        <div className="flex items-start gap-3">
          <span className="text-xs font-mono text-text-tertiary uppercase w-16 pt-2">Expr</span>
          <div className="flex-1">
            <input
              type="text"
              value={customExpression}
              onChange={(e) => onCustomExpressionChange(e.target.value)}
              placeholder="result.status === 'approved'"
              className={`
                w-full h-9 px-3
                bg-bg-tertiary text-text-primary text-sm font-mono
                border rounded-md
                placeholder:text-text-muted
                focus:outline-none focus:ring-1
                ${errors?.customExpression
                  ? 'border-accent-error focus:ring-accent-error'
                  : 'border-border-default hover:border-border-hover focus:ring-purple-500 focus:border-purple-500'
                }
              `}
            />
            {errors?.customExpression && (
              <p className="mt-1 text-xs text-accent-error">{errors.customExpression}</p>
            )}
            <p className="mt-1 text-[10px] text-text-muted">
              JavaScript expression evaluated against workflow output
            </p>
          </div>
        </div>
      )}

      {/* Next status row */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-text-tertiary uppercase w-16">Move to</span>
        <div className="flex-1 relative">
          <select
            value={nextStatus}
            onChange={(e) => onNextStatusChange(e.target.value)}
            className={`
              w-full h-9 px-3 pr-8
              bg-bg-tertiary text-text-primary text-sm font-mono
              border rounded-md
              appearance-none
              focus:outline-none focus:ring-1
              ${errors?.nextStatus
                ? 'border-accent-error focus:ring-accent-error'
                : 'border-border-default hover:border-border-hover focus:ring-emerald-500 focus:border-emerald-500'
              }
            `}
          >
            <option value="">Select status...</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className={`
            inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-md
            text-sm font-medium text-text-secondary
            hover:bg-bg-hover
            transition-colors
            disabled:opacity-50
          `}
        >
          <XMarkIcon className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !nextStatus}
          className={`
            inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-md
            text-sm font-medium
            bg-emerald-500/10 text-emerald-400 border border-emerald-500/30
            hover:bg-emerald-500/20
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}
