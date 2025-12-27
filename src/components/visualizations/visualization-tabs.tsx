/**
 * Tab switcher for different visualization types
 */

'use client';

import React from 'react';
import {
  CircleStackIcon,
  SignalIcon,
  BoltIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

interface Tab {
  id: 'dbml' | 'openapi' | 'graphql' | 'dependencies';
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface VisualizationTabsProps {
  activeTab: 'dbml' | 'openapi' | 'graphql' | 'dependencies';
  onTabChange: (tab: 'dbml' | 'openapi' | 'graphql' | 'dependencies') => void;
}

const TABS: Tab[] = [
  { id: 'dbml', label: 'Database Schema', Icon: CircleStackIcon },
  { id: 'openapi', label: 'API Reference', Icon: SignalIcon },
  { id: 'graphql', label: 'GraphQL Schema', Icon: BoltIcon },
  { id: 'dependencies', label: 'Dependencies', Icon: LinkIcon },
];

export function VisualizationTabs({
  activeTab,
  onTabChange,
}: VisualizationTabsProps) {
  return (
    <div className="border-b border-border-default bg-bg-secondary">
      <div className="flex items-center overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-4 py-3
              text-sm font-medium
              border-b-2 transition-colors
              whitespace-nowrap
              flex items-center gap-2
              cursor-pointer
              ${
                activeTab === tab.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }
            `}
          >
            <tab.Icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
