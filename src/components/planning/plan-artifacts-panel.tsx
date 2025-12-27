'use client';

/**
 * Plan Artifacts Panel
 *
 * Tabbed container for viewing all artifact types generated during planning.
 */

import { useState } from 'react';
import { usePlanningStore, useArtifactCounts } from '@/store/planning.store';
import {
  MermaidDiagramViewer,
  TaskListViewer,
  APISpecViewer,
  UIMockupViewer,
} from './artifacts';

// ============================================================================
// Types
// ============================================================================

type ArtifactTab = 'diagrams' | 'tasks' | 'ui' | 'api';

interface PlanArtifactsPanelProps {
  className?: string;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const tabConfig: Record<ArtifactTab, { label: string; icon: string }> = {
  diagrams: { label: 'Diagrams', icon: '📊' },
  tasks: { label: 'Tasks', icon: '📋' },
  ui: { label: 'UI Specs', icon: '🎨' },
  api: { label: 'API Specs', icon: '🔌' },
};

// ============================================================================
// Component
// ============================================================================

export function PlanArtifactsPanel({ className = '' }: PlanArtifactsPanelProps) {
  const [activeTab, setActiveTab] = useState<ArtifactTab>('diagrams');
  const artifacts = usePlanningStore((s) => s.artifacts);
  const counts = useArtifactCounts();

  const tabs: ArtifactTab[] = ['diagrams', 'tasks', 'ui', 'api'];

  const getCount = (tab: ArtifactTab): number => {
    switch (tab) {
      case 'diagrams': return counts.diagrams;
      case 'tasks': return counts.tasks;
      case 'ui': return counts.uiMockups;
      case 'api': return counts.apiSpecs;
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tab header */}
      <div className="flex items-center border-b border-border-default bg-bg-secondary">
        {tabs.map((tab) => {
          const config = tabConfig[tab];
          const count = getCount(tab);
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                relative flex items-center gap-2 px-4 py-3
                text-sm font-medium transition-colors cursor-pointer
                border-b-2 -mb-px
                ${isActive
                  ? 'border-accent-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
                }
              `}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
              {count > 0 && (
                <span
                  className={`
                    min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
                    flex items-center justify-center
                    ${isActive
                      ? 'bg-accent-primary text-white'
                      : 'bg-bg-tertiary text-text-tertiary'
                    }
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 bg-bg-primary">
        {activeTab === 'diagrams' && (
          <MermaidDiagramViewer diagrams={artifacts.diagrams} />
        )}
        {activeTab === 'tasks' && (
          <TaskListViewer tasks={artifacts.tasks} />
        )}
        {activeTab === 'ui' && (
          <UIMockupViewer mockups={artifacts.uiMockups} />
        )}
        {activeTab === 'api' && (
          <APISpecViewer specs={artifacts.apiSpecs} />
        )}
      </div>

      {/* Summary footer */}
      {counts.total > 0 && (
        <div className="px-4 py-2 border-t border-border-default bg-bg-secondary">
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>
              <span className="font-bold text-text-secondary">{counts.total}</span> artifacts generated
            </span>
            <span className="flex items-center gap-3">
              {counts.diagrams > 0 && <span>{counts.diagrams} diagrams</span>}
              {counts.tasks > 0 && <span>{counts.tasks} tasks</span>}
              {counts.uiMockups > 0 && <span>{counts.uiMockups} UI specs</span>}
              {counts.apiSpecs > 0 && <span>{counts.apiSpecs} API specs</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
