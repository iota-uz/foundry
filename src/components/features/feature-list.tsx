'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/shared';
import { SparklesIcon } from '@heroicons/react/24/outline';
import type { Feature, Module } from '@/types';

interface FeatureListProps {
  features: Feature[];
  modules: Module[];
  moduleId?: string;
  isLoading?: boolean;
}

export function FeatureList({
  features,
  modules,
  moduleId,
  isLoading,
}: FeatureListProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'in_progress' | 'completed'>('all');

  const filteredFeatures = features.filter((f) => {
    if (moduleId && f.moduleId !== moduleId) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-bg-secondary border border-border-default rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (filteredFeatures.length === 0) {
    return (
      <EmptyState
        icon={<SparklesIcon className="h-16 w-16" />}
        title="No Features"
        description={
          statusFilter === 'all'
            ? 'Create your first feature to get started'
            : `No ${statusFilter} features found`
        }
        action={{
          label: '+ New Feature',
          onClick: () => {
            // TODO: Open new feature dialog
            console.log('Create feature');
          },
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'draft', 'in_progress', 'completed'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`
              px-3 py-1 rounded-md text-sm font-medium transition-colors
              ${statusFilter === filter
                ? 'bg-accent-primary text-white'
                : 'bg-bg-secondary border border-border-default text-text-secondary hover:border-accent-primary'
              }
            `}
          >
            {filter === 'all' ? 'All' : filter.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Features */}
      <div className="space-y-2">
        {filteredFeatures.map((feature) => (
          <FeatureListItem key={feature.id} feature={feature} modules={modules} />
        ))}
      </div>
    </div>
  );
}

function FeatureListItem({
  feature,
  modules,
}: {
  feature: Feature;
  modules: Module[];
}) {
  const moduleData = modules.find((m) => m.id === feature.moduleId);
  const statusColor = {
    draft: 'bg-gray-900/30 text-gray-300',
    in_progress: 'bg-blue-900/30 text-blue-300',
    completed: 'bg-green-900/30 text-green-300',
  };

  const phaseColor = {
    cpo: 'bg-purple-900/30 text-purple-300',
    clarify: 'bg-orange-900/30 text-orange-300',
    cto: 'bg-cyan-900/30 text-cyan-300',
    complete: 'bg-green-900/30 text-green-300',
  };

  return (
    <Link href={`/features/${feature.id}`}>
      <div className="
        p-4
        bg-bg-secondary border border-border-default rounded-lg
        hover:border-accent-primary hover:bg-bg-tertiary
        transition-all cursor-pointer
      ">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary mb-1 truncate">
              {feature.name}
            </h3>
            <p className="text-xs text-text-secondary line-clamp-1 mb-2">
              {feature.description}
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  statusColor[feature.status as keyof typeof statusColor]
                }`}
              >
                {feature.status.replace('_', ' ')}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  phaseColor[feature.phase as keyof typeof phaseColor]
                }`}
              >
                {feature.phase}
              </span>
              {moduleData && (
                <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                  {moduleData.name}
                </span>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="flex-shrink-0 text-right">
            {feature.taskProgress.total > 0 && (
              <div className="mb-2">
                <p className="text-xs text-text-secondary">
                  {feature.taskProgress.completed}/{feature.taskProgress.total} tasks
                </p>
                <div className="w-12 h-1.5 bg-bg-tertiary rounded-full mt-1">
                  <div
                    className="h-full rounded-full bg-accent-primary transition-all"
                    style={{
                      width: `${feature.taskProgress.percentComplete}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {feature.checklistProgress.total > 0 && (
              <div>
                <p className="text-xs text-text-secondary">
                  {feature.checklistProgress.verified}/{feature.checklistProgress.total} checked
                </p>
                <div className="w-12 h-1.5 bg-bg-tertiary rounded-full mt-1">
                  <div
                    className="h-full rounded-full bg-accent-success transition-all"
                    style={{
                      width: `${feature.checklistProgress.percentComplete}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
