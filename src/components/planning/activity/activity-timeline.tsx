'use client';

/**
 * Activity Timeline Component
 *
 * Renders a vertical timeline of agent activities with:
 * - Connected dots/lines for visual flow
 * - Grouped consecutive text deltas
 * - Filtering by activity type
 * - Auto-scroll to latest activity
 */

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type { AgentActivityEvent, AgentActivityType } from '@/lib/planning/types';
import { ActivityLogEntry } from './activity-log-entry';

interface ActivityTimelineProps {
  activities: AgentActivityEvent[];
  autoScroll?: boolean;
  filter?: AgentActivityType | 'all';
  maxHeight?: string;
}

/**
 * Groups consecutive text deltas into single entries for cleaner display.
 */
function groupActivities(activities: AgentActivityEvent[]): AgentActivityEvent[] {
  const grouped: AgentActivityEvent[] = [];
  let currentTextGroup: AgentActivityEvent | null = null;

  for (const activity of activities) {
    if (activity.activityType === 'text_delta') {
      if (currentTextGroup !== null) {
        // Append to existing group
        const existingData: AgentActivityEvent['data'] = currentTextGroup.data;
        const newTextDelta = (existingData.textDelta ?? '') + (activity.data.textDelta ?? '');
        currentTextGroup = {
          id: currentTextGroup.id,
          activityType: currentTextGroup.activityType,
          timestamp: currentTextGroup.timestamp,
          nodeId: currentTextGroup.nodeId,
          data: {
            ...existingData,
            textDelta: newTextDelta,
          },
        };
      } else {
        // Start new group
        currentTextGroup = {
          id: activity.id,
          activityType: activity.activityType,
          timestamp: activity.timestamp,
          nodeId: activity.nodeId,
          data: { ...activity.data },
        };
      }
    } else {
      // Flush text group if exists
      if (currentTextGroup !== null) {
        grouped.push(currentTextGroup);
        currentTextGroup = null;
      }
      grouped.push(activity);
    }
  }

  // Flush remaining text group
  if (currentTextGroup !== null) {
    grouped.push(currentTextGroup);
  }

  return grouped;
}

/**
 * Filter activities by type.
 */
function filterActivities(
  activities: AgentActivityEvent[],
  filter: AgentActivityType | 'all'
): AgentActivityEvent[] {
  if (filter === 'all') {
    return activities;
  }
  return activities.filter((a) => a.activityType === filter);
}

export function ActivityTimeline({
  activities,
  autoScroll = true,
  filter = 'all',
  maxHeight = '100%',
}: ActivityTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Group and filter activities
  const processedActivities = useMemo(() => {
    const filtered = filterActivities(activities, filter);
    return groupActivities(filtered);
  }, [activities, filter]);

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [processedActivities.length, autoScroll]);

  // Toggle expanded state for an activity
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (processedActivities.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-tertiary text-sm">
        No activities yet
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
      style={{ maxHeight }}
    >
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border-subtle" />

        {/* Activity entries */}
        <div className="space-y-3 pl-8 pr-2 py-2">
          {processedActivities.map((activity, index) => (
            <div key={activity.id} className="relative">
              {/* Timeline dot */}
              <div
                className={`absolute -left-5 top-3 w-2.5 h-2.5 rounded-full border-2 ${getTimelineDotStyles(activity.activityType)}`}
              />

              {/* Activity entry */}
              <ActivityLogEntry
                activity={activity}
                isExpanded={expandedIds.has(activity.id)}
                onToggle={() => toggleExpanded(activity.id)}
              />

              {/* Connector line to next entry */}
              {index < processedActivities.length - 1 && (
                <div className="absolute -left-[15px] top-6 bottom-[-12px] w-px bg-border-subtle" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Get timeline dot styles based on activity type.
 */
function getTimelineDotStyles(activityType: AgentActivityType): string {
  switch (activityType) {
    case 'tool_start':
      return 'bg-accent-primary border-accent-primary/30';
    case 'tool_result':
      return 'bg-accent-success border-accent-success/30';
    case 'text_delta':
      return 'bg-text-secondary border-border-subtle';
    case 'thinking':
      return 'bg-amber-500 border-amber-500/30';
    case 'error':
      return 'bg-accent-error border-accent-error/30';
    default:
      return 'bg-text-tertiary border-border-subtle';
  }
}

/**
 * Activity filter tabs component.
 */
interface ActivityFilterTabsProps {
  activeFilter: AgentActivityType | 'all';
  onFilterChange: (filter: AgentActivityType | 'all') => void;
  counts: {
    all: number;
    tools: number;
    text: number;
    thinking: number;
    errors: number;
  };
}

export function ActivityFilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: ActivityFilterTabsProps) {
  const tabs: Array<{ id: AgentActivityType | 'all'; label: string; count: number }> = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'tool_start', label: 'Tools', count: counts.tools },
    { id: 'text_delta', label: 'Text', count: counts.text },
    { id: 'thinking', label: 'Thinking', count: counts.thinking },
    { id: 'error', label: 'Errors', count: counts.errors },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-bg-tertiary rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            activeFilter === tab.id
              ? 'bg-bg-primary text-text-primary shadow-sm'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeFilter === tab.id
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'bg-bg-hover text-text-tertiary'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
