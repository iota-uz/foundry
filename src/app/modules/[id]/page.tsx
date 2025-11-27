'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/store';
import { Breadcrumbs } from '@/components/layout';
import { Button, SkeletonCard, EmptyState } from '@/components/shared';
import { FeatureList } from '@/components/features';
import { PlusIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import type { Module } from '@/types';

interface ModulePageProps {
  params: { id: string };
}

export default function ModulePage({ params }: ModulePageProps) {
  const { modules, features, loading } = useProjectStore();
  const [module, setModule] = useState<Module | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (modules.length > 0) {
      const found = modules.find((m) => m.id === params.id);
      setModule(found || null);
    }
  }, [modules, params.id]);

  if (!mounted || loading) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: 'Modules', href: '/modules' },
            { label: 'Loading...' },
          ]}
        />
        <div className="p-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Modules', href: '/modules' }, { label: 'Not Found' }]} />
        <div className="p-6">
          <EmptyState
            icon={<ChevronLeftIcon className="h-16 w-16" />}
            title="Module Not Found"
            description="The module you're looking for doesn't exist."
            action={{
              label: 'Back to Modules',
              onClick: () => (window.location.href = '/modules'),
            }}
          />
        </div>
      </div>
    );
  }

  const moduleFeatures = features.filter((f) => f.moduleId === module.id);
  const completedCount = moduleFeatures.filter((f) => f.status === 'completed').length;
  const completionPercentage = moduleFeatures.length > 0
    ? Math.round((completedCount / moduleFeatures.length) * 100)
    : 0;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Modules', href: '/modules' },
          { label: module.name },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Module Header */}
        <section className="border-b border-border-default pb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                {module.name}
              </h1>
              <p className="text-text-secondary max-w-2xl">{module.description}</p>
            </div>
            <Button
              onClick={() => {
                // TODO: Open new feature dialog for this module
                console.log('New feature in module', module.id);
              }}
              icon={<PlusIcon className="h-4 w-4" />}
            >
              New Feature
            </Button>
          </div>

          {/* Module Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Features" value={moduleFeatures.length} />
            <StatCard label="Completed" value={completedCount} variant="success" />
            <StatCard
              label="In Progress"
              value={moduleFeatures.filter((f) => f.status === 'in_progress').length}
              variant="warning"
            />
            <StatCard label="Completion" value={completionPercentage} unit="%" />
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Progress</span>
              <span className="text-sm text-text-secondary">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-2">
              <div
                className="h-full rounded-full bg-accent-primary transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Features</h2>
            <span className="text-sm text-text-secondary">
              {moduleFeatures.length} total
            </span>
          </div>
          <FeatureList features={features} modules={modules} moduleId={module.id} />
        </section>
      </div>
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
