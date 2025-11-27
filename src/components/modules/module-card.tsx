'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Module, Feature } from '@/types';

interface ModuleCardProps {
  module: Module;
  features: Feature[];
}

export function ModuleCard({ module, features }: ModuleCardProps) {
  const moduleFeatures = features.filter((f) => f.moduleId === module.id);
  const completedCount = moduleFeatures.filter((f) => f.status === 'completed').length;
  const completionPercentage = moduleFeatures.length > 0
    ? Math.round((completedCount / moduleFeatures.length) * 100)
    : 0;

  return (
    <Link href={`/modules/${module.id}`}>
      <div className="
        h-full p-4
        bg-bg-secondary border border-border-default rounded-lg
        hover:border-accent-primary hover:bg-bg-tertiary
        transition-all cursor-pointer
        flex flex-col
      ">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary mb-1 truncate">
              {module.name}
            </h3>
            <p className="text-xs text-text-secondary line-clamp-2">
              {module.description}
            </p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-text-secondary flex-shrink-0 ml-2" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-xs text-text-secondary">
          <span>{moduleFeatures.length} features</span>
          <span>{completedCount} completed</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-bg-tertiary rounded-full h-1.5">
          <div
            className="h-full rounded-full bg-accent-primary transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Footer */}
        <div className="mt-2 text-xs text-text-secondary">
          {completionPercentage}% complete
        </div>
      </div>
    </Link>
  );
}
