/**
 * Visualizations Page
 *
 * Dashboard for workflow execution insights and analytics.
 * Features:
 * - Execution overview with stats
 * - Workflow graph viewer
 * - Node performance analytics
 */

'use client';

import React, { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import {
  WorkflowVisualizationTabs,
  ExecutionOverview,
  WorkflowGraphViewer,
  NodeAnalytics,
  type VisualizationTab,
} from '@/components/visualizations';

export default function VisualizationsPage() {
  const [activeTab, setActiveTab] = useState<VisualizationTab>('overview');

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Breadcrumbs items={[{ label: 'Visualizations' }]} />

      {/* Tab Navigation */}
      <WorkflowVisualizationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && <ExecutionOverview />}
        {activeTab === 'graph' && <WorkflowGraphViewer />}
        {activeTab === 'analytics' && <NodeAnalytics />}
      </div>
    </div>
  );
}
