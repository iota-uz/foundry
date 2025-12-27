'use client';

/**
 * Phase Stepper Component
 *
 * Visual progress indicator for the 3-phase planning workflow.
 * Shows Requirements -> Clarify -> Technical progression.
 */

import { CheckIcon } from '@heroicons/react/24/solid';
import type { PlanningPhase } from '@/lib/planning/types';
import { usePlanningProgress } from '@/store/planning.store';

// ============================================================================
// Types
// ============================================================================

interface PhaseStepperProps {
  className?: string;
}

// ============================================================================
// Phase Configuration
// ============================================================================

const phaseConfig: Record<PlanningPhase, { label: string; description: string; icon: string }> = {
  requirements: {
    label: 'Requirements',
    description: 'Define what needs to be built',
    icon: '1',
  },
  clarify: {
    label: 'Clarify',
    description: 'Resolve ambiguities',
    icon: '2',
  },
  technical: {
    label: 'Technical',
    description: 'Architecture decisions',
    icon: '3',
  },
};

// ============================================================================
// Component
// ============================================================================

export function PhaseStepper({ className = '' }: PhaseStepperProps) {
  const { currentPhase, phases, phaseProgress, currentIndex } = usePlanningProgress();

  return (
    <div className={`flex items-center ${className}`}>
      {phases.map((phase, index) => {
        const config = phaseConfig[phase];
        const progress = phaseProgress[phase];
        const isActive = phase === currentPhase;
        const isCompleted = progress.completed;
        const isPast = index < currentIndex || isCompleted;
        const isFuture = index > currentIndex && !isCompleted;

        return (
          <div key={phase} className="flex items-center">
            {/* Step */}
            <div className="flex items-center gap-3">
              {/* Circle indicator */}
              <div
                className={`
                  relative flex items-center justify-center w-8 h-8 rounded-full
                  font-bold text-sm transition-all duration-300
                  ${isCompleted
                    ? 'bg-accent-success text-white'
                    : isActive
                      ? 'bg-accent-primary text-white ring-4 ring-accent-primary/20'
                      : isPast
                        ? 'bg-accent-primary/50 text-white'
                        : 'bg-bg-tertiary text-text-tertiary border border-border-default'
                  }
                `}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <span>{config.icon}</span>
                )}

                {/* Pulse animation for active */}
                {isActive && !isCompleted && (
                  <span className="absolute inset-0 rounded-full bg-accent-primary animate-ping opacity-20" />
                )}
              </div>

              {/* Label and description */}
              <div className="hidden sm:block">
                <div
                  className={`text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-text-primary'
                      : isPast || isCompleted
                        ? 'text-text-secondary'
                        : 'text-text-tertiary'
                  }`}
                >
                  {config.label}
                </div>
                <div
                  className={`text-xs transition-colors ${
                    isActive ? 'text-text-secondary' : 'text-text-tertiary'
                  }`}
                >
                  {isCompleted
                    ? `${progress.questionsAnswered} answered`
                    : isActive
                      ? config.description
                      : isFuture
                        ? 'Upcoming'
                        : config.description
                  }
                </div>
              </div>
            </div>

            {/* Connector line */}
            {index < phases.length - 1 && (
              <div
                className={`
                  w-12 sm:w-20 h-0.5 mx-3 transition-colors duration-300
                  ${isPast || isCompleted ? 'bg-accent-success/50' : 'bg-border-default'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export function PhaseStepperCompact({ className = '' }: PhaseStepperProps) {
  const { currentPhase, phases, phaseProgress } = usePlanningProgress();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {phases.map((phase) => {
        const isActive = phase === currentPhase;
        const isCompleted = phaseProgress[phase].completed;

        return (
          <div
            key={phase}
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${isCompleted
                ? 'bg-accent-success'
                : isActive
                  ? 'bg-accent-primary w-6'
                  : 'bg-border-default'
              }
            `}
            title={phaseConfig[phase].label}
          />
        );
      })}
    </div>
  );
}
