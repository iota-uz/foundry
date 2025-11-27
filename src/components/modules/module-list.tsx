'use client';

import React from 'react';
import { EmptyState } from '@/components/shared';
import { FolderIcon } from '@heroicons/react/24/outline';
import { ModuleCard } from './module-card';
import type { Module, Feature } from '@/types';

interface ModuleListProps {
  modules: Module[];
  features: Feature[];
  isLoading?: boolean;
}

export function ModuleList({ modules, features, isLoading }: ModuleListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-bg-secondary border border-border-default rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <EmptyState
        icon={<FolderIcon className="h-16 w-16" />}
        title="No Modules Yet"
        description="Create your first module to organize features"
        action={{
          label: '+ New Module',
          onClick: () => {
            // TODO: Open new module dialog
            console.log('Create module');
          },
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} features={features} />
      ))}
    </div>
  );
}
