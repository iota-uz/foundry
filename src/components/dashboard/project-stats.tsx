'use client';

import React from 'react';
import type { Project, Feature, Module } from '@/types';

interface ProjectStatsProps {
  project: Project | null;
  modules: Module[];
  features: Feature[];
}

export function ProjectStats({ project, modules, features }: ProjectStatsProps) {
  if (!project) {
    return null;
  }

  // Calculate stats
  const totalFeatures = features.length;
  const completedFeatures = features.filter((f) => f.status === 'completed').length;
  const inProgressFeatures = features.filter((f) => f.status === 'in_progress').length;
  const completionPercentage = totalFeatures > 0
    ? Math.round((completedFeatures / totalFeatures) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Project Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-bg-secondary border border-border-default rounded-lg">
            <h3 className="text-sm font-medium text-text-secondary mb-2">
              Project Name
            </h3>
            <p className="text-lg font-semibold text-text-primary">{project.name}</p>
          </div>

          <div className="p-4 bg-bg-secondary border border-border-default rounded-lg">
            <h3 className="text-sm font-medium text-text-secondary mb-2">
              Current Phase
            </h3>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-accent-primary/10 text-accent-primary text-sm font-semibold rounded-md">
                {project.phase.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Modules" value={modules.length} />
          <StatCard label="Features" value={totalFeatures} />
          <StatCard
            label="Completed"
            value={completedFeatures}
            variant="success"
          />
          <StatCard
            label="In Progress"
            value={inProgressFeatures}
            variant="warning"
          />
          <StatCard
            label="Draft"
            value={totalFeatures - completedFeatures - inProgressFeatures}
          />
          <StatCard
            label="Completion"
            value={completionPercentage}
            unit="%"
          />
        </div>
      </section>

      {/* Progress Bars */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Progress</h2>
        <div className="space-y-4">
          <ProgressBar
            label="Feature Completion"
            current={completedFeatures}
            total={totalFeatures}
            variant="success"
          />
          <ProgressBar
            label="In Progress"
            current={inProgressFeatures}
            total={totalFeatures}
            variant="warning"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit = '',
  variant = 'default',
}: {
  label: string;
  value: number;
  unit?: string;
  variant?: 'default' | 'success' | 'warning';
}) {
  const variantStyles = {
    default: 'text-text-primary',
    success: 'text-accent-success',
    warning: 'text-accent-warning',
  };

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-lg">
      <div className="text-sm text-text-secondary mb-1">{label}</div>
      <div className={`text-2xl font-bold ${variantStyles[variant]}`}>
        {value}{unit}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  current,
  total,
  variant = 'default',
}: {
  label: string;
  current: number;
  total: number;
  variant?: 'default' | 'success' | 'warning';
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const variantStyles = {
    default: 'bg-accent-primary',
    success: 'bg-accent-success',
    warning: 'bg-accent-warning',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary">
          {current}/{total} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-bg-tertiary rounded-full h-2">
        <div
          className={`h-full rounded-full transition-all ${variantStyles[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
