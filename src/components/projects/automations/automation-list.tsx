/**
 * Automation List Component
 *
 * Grid display of all automations for a project.
 * Features:
 * - Responsive grid layout
 * - Empty state with CTA
 * - Loading skeleton
 * - Industrial terminal aesthetic
 */

'use client';

import React from 'react';
import { PlusIcon, BoltIcon } from '@heroicons/react/24/outline';
import { AutomationCard } from './automation-card';
import type { Automation } from '@/store/automation.store';

// ============================================================================
// Types
// ============================================================================

interface AutomationListProps {
  automations: Automation[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (automation: Automation) => void;
  onDelete: (automation: Automation) => void;
  onToggle: (automation: Automation, enabled: boolean) => void;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function AutomationSkeleton() {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bg-tertiary" />
          <div>
            <div className="h-3 w-16 bg-bg-tertiary rounded mb-1.5" />
            <div className="h-4 w-24 bg-bg-tertiary rounded" />
          </div>
        </div>
        <div className="w-10 h-5 bg-bg-tertiary rounded-full" />
      </div>
      <div className="h-8 bg-bg-tertiary/50 rounded-md mb-3" />
      <div className="space-y-1.5">
        <div className="h-3 w-20 bg-bg-tertiary rounded" />
        <div className="h-5 w-32 bg-bg-tertiary rounded" />
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon container with scan-line effect */}
      <div className="relative mb-6">
        <div
          className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30
                     flex items-center justify-center"
        >
          <BoltIcon className="w-10 h-10 text-emerald-400" />
        </div>
        {/* Animated glow */}
        <div
          className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl
                     animate-pulse"
        />
      </div>

      {/* Text content */}
      <h3 className="text-lg font-medium text-text-primary mb-2">
        No Automations Yet
      </h3>
      <p className="text-sm text-text-tertiary text-center max-w-sm mb-6">
        Create automations to trigger workflows when issues change status or
        add manual trigger buttons to issue cards.
      </p>

      {/* CTA button */}
      <button
        type="button"
        onClick={onAdd}
        className={`
          inline-flex items-center gap-2
          px-4 py-2.5 rounded-lg
          bg-emerald-500/10 border border-emerald-500/40
          text-emerald-400 text-sm font-medium
          hover:bg-emerald-500/20 hover:border-emerald-500/60
          transition-all duration-200
        `}
      >
        <PlusIcon className="w-4 h-4" />
        Create Automation
      </button>

      {/* Decorative circuit lines */}
      <div className="mt-8 flex items-center gap-4 opacity-30">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-emerald-500/50" />
        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
        <div className="h-px w-24 bg-emerald-500/30" />
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-emerald-500/50" />
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function AutomationList({
  automations,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: AutomationListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array<undefined>(3)].map((_, i) => (
          <AutomationSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (automations.length === 0) {
    return <EmptyState onAdd={onAdd} />;
  }

  // Automation grid
  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-text-tertiary uppercase tracking-wider">
            {automations.length} automation{automations.length !== 1 ? 's' : ''}
          </span>
          <div className="h-px w-8 bg-border-subtle" />
        </div>
        <button
          type="button"
          onClick={onAdd}
          className={`
            inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-lg
            bg-emerald-500/10 border border-emerald-500/30
            text-emerald-400 text-sm font-medium
            hover:bg-emerald-500/20 hover:border-emerald-500/50
            transition-all duration-200
          `}
        >
          <PlusIcon className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {automations.map((automation) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onEdit={() => onEdit(automation)}
            onDelete={() => onDelete(automation)}
            onToggle={(enabled) => onToggle(automation, enabled)}
          />
        ))}
      </div>
    </div>
  );
}
