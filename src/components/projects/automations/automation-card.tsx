/**
 * Automation Card Component
 *
 * Displays a single automation with its trigger and transitions.
 * Features:
 * - Status/manual trigger visualization
 * - Enabled/disabled state styling
 * - Transition flow preview
 * - Industrial aesthetic with circuit-board patterns
 */

'use client';

import React from 'react';
import {
  BoltIcon,
  PlayIcon,
  TrashIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { Automation } from '@/store/automation.store';

// ============================================================================
// Types
// ============================================================================

interface AutomationCardProps {
  automation: Automation;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AutomationCard({
  automation,
  onEdit,
  onDelete,
  onToggle,
}: AutomationCardProps) {
  const isStatusTrigger = automation.triggerType === 'status_enter';

  return (
    <div
      className={`
        group relative
        bg-bg-secondary border rounded-xl
        transition-all duration-300 ease-out
        cursor-pointer
        ${automation.enabled
          ? 'border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10'
          : 'border-border-subtle opacity-60 hover:opacity-80'
        }
      `}
      onClick={onEdit}
    >
      {/* Circuit pattern overlay */}
      <div
        className={`
          absolute inset-0 rounded-xl pointer-events-none
          opacity-0 group-hover:opacity-100
          transition-opacity duration-500
        `}
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 49%, rgba(16, 185, 129, 0.03) 50%, transparent 51%),
            linear-gradient(0deg, transparent 49%, rgba(16, 185, 129, 0.03) 50%, transparent 51%)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Enabled glow effect */}
      {automation.enabled && (
        <div
          className={`
            absolute -inset-px rounded-xl
            bg-gradient-to-r from-emerald-500/20 via-transparent to-teal-500/20
            opacity-0 group-hover:opacity-100
            transition-opacity duration-300
            pointer-events-none
          `}
        />
      )}

      {/* Card content */}
      <div className="relative p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          {/* Trigger icon and type */}
          <div className="flex items-center gap-3">
            <div
              className={`
                w-10 h-10 rounded-lg
                flex items-center justify-center
                transition-colors duration-200
                ${automation.enabled
                  ? isStatusTrigger
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  : 'bg-bg-tertiary text-text-muted border border-border-subtle'
                }
              `}
            >
              {isStatusTrigger ? (
                <BoltIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
                  {isStatusTrigger ? 'on status' : 'manual'}
                </span>
                {automation.priority > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-bg-tertiary text-text-muted">
                    p{automation.priority}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium text-text-primary mt-0.5">
                {isStatusTrigger
                  ? (automation.triggerStatus !== undefined && automation.triggerStatus !== '' ? automation.triggerStatus : 'Any Status')
                  : (automation.buttonLabel !== undefined && automation.buttonLabel !== '' ? automation.buttonLabel : 'Run Workflow')
                }
              </h3>
            </div>
          </div>

          {/* Toggle and actions */}
          <div className="flex items-center gap-2">
            {/* Toggle switch */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(!automation.enabled);
              }}
              className={`
                relative w-10 h-5 rounded-full
                transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary
                ${automation.enabled ? 'bg-emerald-500' : 'bg-bg-tertiary border border-border-default'}
              `}
            >
              <div
                className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm
                  transition-all duration-200
                  ${automation.enabled ? 'left-auto right-0.5' : 'left-0.5 right-auto'}
                `}
              />
            </button>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`
                p-1.5 rounded-md
                text-text-tertiary hover:text-accent-error
                hover:bg-accent-error/10
                transition-colors duration-150
                opacity-0 group-hover:opacity-100
              `}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workflow indicator */}
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md bg-bg-tertiary/50">
          <ArrowPathIcon className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-xs font-mono text-text-secondary truncate">
            workflow:{automation.workflowId.slice(0, 8)}...
          </span>
        </div>

        {/* Transitions preview */}
        {automation.transitions.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
              Transitions
            </div>
            <div className="space-y-1">
              {automation.transitions.slice(0, 2).map((transition) => (
                <div
                  key={transition.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className={`
                      px-1.5 py-0.5 rounded font-mono
                      ${transition.condition === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : transition.condition === 'failure'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-purple-500/10 text-purple-400'
                      }
                    `}
                  >
                    {transition.condition}
                  </span>
                  <ChevronRightIcon className="w-3 h-3 text-text-muted" />
                  <span className="font-mono text-text-secondary">
                    {transition.nextStatus}
                  </span>
                </div>
              ))}
              {automation.transitions.length > 2 && (
                <div className="text-[10px] text-text-muted font-mono">
                  +{automation.transitions.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* No transitions indicator */}
        {automation.transitions.length === 0 && (
          <div className="text-xs text-text-muted font-mono">
            No transitions configured
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className={`
          absolute bottom-0 left-4 right-4 h-px
          bg-gradient-to-r from-transparent to-transparent
          ${automation.enabled
            ? 'via-emerald-500/40'
            : 'via-border-subtle'
          }
        `}
      />
    </div>
  );
}
