'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store';
import { EmptyState, SkeletonCard } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import {
  ProjectStats,
  RecentActivity,
  QuickActions,
} from '@/components/dashboard';
import type { ActivityItem } from '@/components/dashboard/recent-activity';
import { FolderIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const router = useRouter();
  const { project, modules, features, loading } = useProjectStore();
  const [mounted, setMounted] = useState(false);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [startingWorkflow, setStartingWorkflow] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch recent activities from API
  useEffect(() => {
    if (project) {
      // Placeholder for recent activities
      setRecentActivities([]);
    }
  }, [project]);

  const handleStartWorkflow = useCallback(async (workflowId: 'cpo-phase' | 'cto-phase') => {
    if (!project) return;

    setStartingWorkflow(true);
    try {
      const response = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          workflowId,
          mode: 'new',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start workflow');
      }

      const data = await response.json();

      // Navigate to Q&A page with session ID
      router.push(`/qa?sessionId=${data.sessionId}`);
    } catch (error) {
      console.error('Error starting workflow:', error);
      alert('Failed to start workflow. Please try again.');
    } finally {
      setStartingWorkflow(false);
    }
  }, [project, router]);

  if (!mounted) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={<FolderIcon className="h-16 w-16" />}
          title="No Project Loaded"
          description="Start by creating a new specification or opening an existing project."
          action={{
            label: 'Start New Spec',
            onClick: () => {
              // TODO: Navigate to new spec wizard
            },
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />

      <div className="p-6 space-y-6">
        <ProjectStats project={project} modules={modules} features={features} />

        {recentActivities.length > 0 && (
          <RecentActivity activities={recentActivities} />
        )}

        <QuickActions
          projectPhase={project.phase}
          onNewFeature={() => {
            // TODO: Handle new feature
          }}
          onNewModule={() => {
            // TODO: Handle new module
          }}
          onStartCPO={() => handleStartWorkflow('cpo-phase')}
          onStartCTO={() => handleStartWorkflow('cto-phase')}
          disabled={startingWorkflow}
        />
      </div>
    </div>
  );
}
