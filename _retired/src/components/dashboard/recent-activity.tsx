'use client';

import React from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'complete';
  actor: string;
  subject: string;
  subjectId: string;
  subjectType: 'feature' | 'module' | 'schema' | 'api' | 'component';
  timestamp: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  limit?: number;
}

export function RecentActivity({ activities, limit = 10 }: RecentActivityProps) {
  const recentActivities = activities.slice(0, limit);

  if (recentActivities.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Recent Activity
        </h2>
        <div className="p-8 bg-bg-secondary border border-border-default rounded-lg text-center">
          <p className="text-text-secondary">No recent activity yet</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Recent Activity
      </h2>
      <div className="space-y-1 bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
        {recentActivities.map((activity, index) => (
          <ActivityItemComponent
            key={activity.id}
            activity={activity}
            isLast={index === recentActivities.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function ActivityItemComponent({
  activity,
  isLast,
}: {
  activity: ActivityItem;
  isLast: boolean;
}) {
  const icon = getActivityIcon(activity.type);
  const action = getActivityAction(activity.type);
  const href = getActivityLink(activity.subjectType, activity.subjectId);
  const timeAgo = formatTimeAgo(activity.timestamp);

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-4 py-3
        hover:bg-bg-tertiary transition-colors
        ${!isLast ? 'border-b border-border-default' : ''}
      `}
    >
      <div className="text-accent-primary flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">
          <span className="font-medium">{action}</span>
          <span className="text-text-secondary">{' '}{activity.subject}</span>
        </p>
        <p className="text-xs text-text-secondary mt-1">{timeAgo}</p>
      </div>
    </Link>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'create':
      return <PlusIcon className="h-5 w-5" />;
    case 'update':
      return <PencilSquareIcon className="h-5 w-5" />;
    case 'complete':
      return <CheckCircleIcon className="h-5 w-5" />;
    default:
      return <ClockIcon className="h-5 w-5" />;
  }
}

function getActivityAction(type: string) {
  switch (type) {
    case 'create':
      return 'Created';
    case 'update':
      return 'Updated';
    case 'complete':
      return 'Completed';
    default:
      return 'Modified';
  }
}

function getActivityLink(subjectType: string, subjectId: string) {
  switch (subjectType) {
    case 'feature':
      return `/features/${subjectId}`;
    case 'module':
      return `/modules/${subjectId}`;
    case 'schema':
      return '/visualizations?tab=schema';
    case 'api':
      return '/visualizations?tab=api';
    case 'component':
      return '/ui-library';
    default:
      return '/';
  }
}

function formatTimeAgo(timestamp: string) {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'Just now';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
