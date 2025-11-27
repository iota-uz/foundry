'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/store';
import { EmptyState, SkeletonCard } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import {
  ProjectStats,
  RecentActivity,
  QuickActions,
} from '@/components/dashboard';
import { FolderIcon } from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export default function DashboardPage() {
  const { project, modules, features, loading } = useProjectStore();
  const [mounted, setMounted] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // TODO: Fetch recent activities from API
  useEffect(() => {
    if (project) {
      // Placeholder for recent activities
      setRecentActivities([]);
    }
  }, [project]);

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
        />
      </div>
    </div>
  );
}
