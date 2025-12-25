/**
 * Wizard Shell Component
 *
 * Container for multi-step project creation wizard.
 * Features:
 * - Terminal-inspired step indicator
 * - Step navigation with back/next
 * - Progress tracking
 * - Keyboard navigation
 */

'use client';

import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

export interface WizardStep {
  id: string;
  title: string;
  description: string;
}

interface WizardShellProps {
  steps: WizardStep[];
  currentStep: number;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  canGoNext?: boolean;
  isLastStep?: boolean;
  isSubmitting?: boolean;
}

// ============================================================================
// Step Indicator
// ============================================================================

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: WizardStep[];
  currentStep: number;
}) {
  return (
    <div className="mb-8">
      {/* Terminal-style header */}
      <div className="flex items-center gap-2 mb-4 text-text-tertiary font-mono text-xs">
        <span className="text-emerald-400">$</span>
        <span>create-project</span>
        <span className="text-text-muted">--step</span>
        <span className="text-emerald-400">{currentStep + 1}</span>
        <span className="text-text-muted">of</span>
        <span className="text-emerald-400">{steps.length}</span>
      </div>

      {/* Progress bar */}
      <div className="relative">
        {/* Background track */}
        <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div
                key={step.id}
                className={`
                  relative flex items-center justify-center
                  w-6 h-6 rounded-full
                  transition-all duration-200
                  ${isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-bg-primary border-2 border-emerald-500 text-emerald-400'
                    : 'bg-bg-tertiary border border-border-default text-text-tertiary'
                  }
                `}
              >
                {isCompleted ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-xs font-mono font-medium">
                    {index + 1}
                  </span>
                )}

                {/* Step label - visible on hover or current */}
                <div
                  className={`
                    absolute top-full mt-2
                    text-xs font-medium whitespace-nowrap
                    transition-opacity duration-150
                    ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    ${isCompleted
                      ? 'text-emerald-400'
                      : isCurrent
                      ? 'text-text-primary'
                      : 'text-text-tertiary'
                    }
                  `}
                >
                  {step.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current step info */}
      <div className="mt-10 mb-2">
        <h2 className="text-xl font-semibold text-text-primary">
          {steps[currentStep]?.title}
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          {steps[currentStep]?.description}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function WizardShell({
  steps,
  currentStep,
  children,
  onBack,
  onNext,
  canGoNext = true,
  isLastStep = false,
  isSubmitting = false,
}: WizardShellProps) {
  const isFirstStep = currentStep === 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicator */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* Step content */}
      <div className="min-h-[320px]">{children}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-subtle">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep || isSubmitting}
          className={`
            inline-flex items-center gap-2
            px-4 py-2 rounded-lg
            text-sm font-medium
            transition-all duration-150
            ${isFirstStep
              ? 'text-text-muted cursor-not-allowed'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }
          `}
        >
          <span className="font-mono text-xs">←</span>
          <span>Back</span>
        </button>

        {/* Next / Submit button */}
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className={`
            inline-flex items-center gap-2
            px-5 py-2.5 rounded-lg
            text-sm font-medium
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isLastStep
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
              : 'bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-hover hover:border-border-hover'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Creating...</span>
            </>
          ) : isLastStep ? (
            <>
              <span>Create Project</span>
              <span className="font-mono text-xs">⏎</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <span className="font-mono text-xs">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
