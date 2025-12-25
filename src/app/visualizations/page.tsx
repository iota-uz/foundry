/**
 * Visualizations page - temporarily simplified during workflow builder migration
 *
 * TODO: Rebuild with workflow-specific visualizations (execution graphs, node states, etc.)
 */

'use client';

import React from 'react';
import { Breadcrumbs } from '@/components/layout';
import { EmptyState } from '@/components/shared';

export default function VisualizationsPage() {
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Breadcrumbs items={[{ label: 'Visualizations' }]} />

      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          title="Visualizations"
          description="Workflow execution visualizations coming soon. This page will show real-time workflow state, execution history, and node status diagrams."
        />
      </div>
    </div>
  );
}
