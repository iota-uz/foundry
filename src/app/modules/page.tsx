'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/store';
import { Breadcrumbs } from '@/components/layout';
import { Button, SkeletonCard, EmptyState } from '@/components/shared';
import { ModuleCard } from '@/components/modules/module-card';
import { NewModuleDialog } from '@/components/dialogs/new-module-dialog';
import { PlusIcon, CubeIcon } from '@heroicons/react/24/outline';

export default function ModulesPage() {
  const { modules, features, loading } = useProjectStore();
  const [mounted, setMounted] = useState(false);
  const [showNewModule, setShowNewModule] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Modules' }]} />
        <div className="p-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Modules' }]} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <section className="border-b border-border-default pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Modules</h1>
              <p className="text-text-secondary max-w-2xl">
                Organize your features into logical modules. Each module represents a distinct
                area of functionality in your application.
              </p>
            </div>
            <Button
              onClick={() => setShowNewModule(true)}
              icon={<PlusIcon className="h-4 w-4" />}
            >
              New Module
            </Button>
          </div>

          {/* Stats */}
          {modules.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Modules" value={modules.length} />
              <StatCard
                label="Total Features"
                value={features.length}
              />
              <StatCard
                label="Completed"
                value={features.filter((f) => f.status === 'completed').length}
                variant="success"
              />
              <StatCard
                label="In Progress"
                value={features.filter((f) => f.status === 'in_progress').length}
                variant="warning"
              />
            </div>
          )}
        </section>

        {/* Modules Grid */}
        <section>
          {modules.length === 0 ? (
            <EmptyState
              icon={<CubeIcon className="h-16 w-16" />}
              title="No Modules Yet"
              description="Get started by creating your first module to organize your features."
              action={{
                label: 'Create Module',
                onClick: () => setShowNewModule(true),
              }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">All Modules</h2>
                <span className="text-sm text-text-secondary">
                  {modules.length} {modules.length === 1 ? 'module' : 'modules'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => (
                  <ModuleCard key={module.id} module={module} features={features} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <NewModuleDialog
        isOpen={showNewModule}
        onClose={() => setShowNewModule(false)}
      />
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
