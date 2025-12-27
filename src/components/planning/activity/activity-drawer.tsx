'use client';

/**
 * Activity Drawer Component
 *
 * Slide-over panel for displaying agent activity with:
 * - Header with title, activity count, close button
 * - Filter tabs for activity types
 * - Activity timeline (scrollable)
 * - Clear activities action
 */

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  TrashIcon,
  ArrowPathIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import type { AgentActivityEvent, AgentActivityType } from '@/lib/planning/types';
import { ActivityTimeline, ActivityFilterTabs } from './activity-timeline';

interface ActivityDrawerProps {
  open: boolean;
  onClose: () => void;
  activities: AgentActivityEvent[];
  onClearActivities: () => void;
  isRunning?: boolean;
}

export function ActivityDrawer({
  open,
  onClose,
  activities,
  onClearActivities,
  isRunning = false,
}: ActivityDrawerProps) {
  const [filter, setFilter] = useState<AgentActivityType | 'all'>('all');

  // Calculate counts for each filter
  const counts = {
    all: activities.length,
    tools: activities.filter(
      (a) => a.activityType === 'tool_start' || a.activityType === 'tool_result'
    ).length,
    text: activities.filter((a) => a.activityType === 'text_delta').length,
    thinking: activities.filter((a) => a.activityType === 'thinking').length,
    errors: activities.filter((a) => a.activityType === 'error').length,
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/20" />
        </Transition.Child>

        {/* Drawer panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-bg-primary shadow-xl border-l border-border-subtle">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border-subtle bg-bg-secondary">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CommandLineIcon className="w-5 h-5 text-accent-primary" />
                          <Dialog.Title className="text-base font-semibold text-text-primary">
                            Agent Activity
                          </Dialog.Title>
                          {isRunning && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-primary/10 text-accent-primary text-xs font-medium rounded-full">
                              <ArrowPathIcon className="w-3 h-3 animate-spin" />
                              Running
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={onClearActivities}
                            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-bg-hover rounded transition-colors"
                            title="Clear activities"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={onClose}
                            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-bg-hover rounded transition-colors"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Activity count */}
                      <p className="mt-1 text-xs text-text-tertiary">
                        {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                      </p>
                    </div>

                    {/* Filter tabs */}
                    <div className="px-4 py-2 border-b border-border-subtle">
                      <ActivityFilterTabs
                        activeFilter={filter}
                        onFilterChange={setFilter}
                        counts={counts}
                      />
                    </div>

                    {/* Timeline content */}
                    <div className="flex-1 overflow-hidden">
                      <ActivityTimeline
                        activities={activities}
                        filter={filter}
                        autoScroll={isRunning}
                        maxHeight="100%"
                      />
                    </div>

                    {/* Footer with helpful info */}
                    {activities.length === 0 && (
                      <div className="px-4 py-3 border-t border-border-subtle bg-bg-secondary">
                        <p className="text-xs text-text-tertiary text-center">
                          Activity will appear here when the agent starts working
                        </p>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * Compact activity indicator button for use in headers.
 * Shows activity count and pulses when running.
 */
interface ActivityIndicatorProps {
  activityCount: number;
  errorCount: number;
  isRunning: boolean;
  onClick: () => void;
}

export function ActivityIndicator({
  activityCount,
  errorCount,
  isRunning,
  onClick,
}: ActivityIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
        errorCount > 0
          ? 'border-accent-error/30 bg-accent-error/5 hover:bg-accent-error/10'
          : isRunning
            ? 'border-accent-primary/30 bg-accent-primary/5 hover:bg-accent-primary/10'
            : 'border-border-subtle bg-bg-secondary hover:bg-bg-hover'
      }`}
      title="View agent activity"
    >
      <CommandLineIcon
        className={`w-4 h-4 ${
          errorCount > 0
            ? 'text-accent-error'
            : isRunning
              ? 'text-accent-primary'
              : 'text-text-tertiary'
        }`}
      />
      <span
        className={`text-xs font-medium ${
          errorCount > 0
            ? 'text-accent-error'
            : isRunning
              ? 'text-accent-primary'
              : 'text-text-secondary'
        }`}
      >
        {activityCount}
      </span>

      {/* Pulsing indicator when running */}
      {isRunning && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary" />
        </span>
      )}

      {/* Error badge */}
      {errorCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-accent-error text-white text-[10px] font-bold">
          {errorCount > 9 ? '9+' : errorCount}
        </span>
      )}
    </button>
  );
}
