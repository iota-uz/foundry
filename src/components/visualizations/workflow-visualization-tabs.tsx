/**
 * Workflow Visualization Tabs
 *
 * Tab container for workflow visualizations with Linear/Vercel-inspired styling.
 * Features:
 * - Smooth tab transitions with underline indicator
 * - Icon + label design
 * - Keyboard navigation support
 */

'use client';

import React from 'react';
import {
  ChartBarIcon,
  ShareIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

export type VisualizationTab = 'overview' | 'graph' | 'analytics';

interface Tab {
  id: VisualizationTab;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface WorkflowVisualizationTabsProps {
  activeTab: VisualizationTab;
  onTabChange: (tab: VisualizationTab) => void;
}

// =============================================================================
// Tab Configuration
// =============================================================================

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: ChartBarIcon },
  { id: 'graph', label: 'Workflow Graph', icon: ShareIcon },
  { id: 'analytics', label: 'Node Analytics', icon: CpuChipIcon },
];

// =============================================================================
// Component
// =============================================================================

export function WorkflowVisualizationTabs({
  activeTab,
  onTabChange,
}: WorkflowVisualizationTabsProps) {
  return (
    <div className="border-b border-border-default bg-bg-secondary/50">
      <div className="flex items-center px-6">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  const nextIndex = (index + 1) % TABS.length;
                  const nextTab = TABS[nextIndex];
                  if (nextTab) onTabChange(nextTab.id);
                  e.preventDefault();
                } else if (e.key === 'ArrowLeft') {
                  const prevIndex = (index - 1 + TABS.length) % TABS.length;
                  const prevTab = TABS[prevIndex];
                  if (prevTab) onTabChange(prevTab.id);
                  e.preventDefault();
                }
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`
                relative flex items-center gap-2 px-4 py-3.5
                text-sm font-medium cursor-pointer
                transition-all duration-150 ease-out
                ${
                  isActive
                    ? 'text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>

              {/* Active indicator line */}
              <span
                className={`
                  absolute bottom-0 left-4 right-4 h-0.5
                  bg-accent-primary rounded-full
                  transition-all duration-200 ease-out
                  ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
                `}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
