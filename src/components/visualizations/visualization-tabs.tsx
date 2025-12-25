/**
 * Tab switcher for different visualization types
 */

'use client';

import React from 'react';

interface Tab {
  id: 'dbml' | 'openapi' | 'graphql' | 'dependencies';
  label: string;
  icon: string;
}

interface VisualizationTabsProps {
  activeTab: 'dbml' | 'openapi' | 'graphql' | 'dependencies';
  onTabChange: (tab: 'dbml' | 'openapi' | 'graphql' | 'dependencies') => void;
}

const TABS: Tab[] = [
  { id: 'dbml', label: 'Database Schema', icon: '🗄️' },
  { id: 'openapi', label: 'API Reference', icon: '📡' },
  { id: 'graphql', label: 'GraphQL Schema', icon: '⚡' },
  { id: 'dependencies', label: 'Dependencies', icon: '🔗' },
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
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
