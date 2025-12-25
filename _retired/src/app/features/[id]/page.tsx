'use client';

import React, { useEffect, useState, use } from 'react';
import { useProjectStore } from '@/store';
import { Breadcrumbs } from '@/components/layout';
import { Button, SkeletonCard, EmptyState } from '@/components/shared';
import {
  BusinessSection,
  TechnicalSection,
  TaskList,
  Checklist,
} from '@/components/features';
import {
  EyeIcon,
  TrashIcon,
  ChevronLeftIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { Feature, Module, TaskStatus } from '@/types';

interface FeaturePageProps {
  params: Promise<{ id: string }>;
}

type TabType = 'business' | 'technical' | 'tasks' | 'checklist' | 'history';

export default function FeaturePage(props: FeaturePageProps) {
  const params = use(props.params);
  const { modules, features, loading, updateFeature } = useProjectStore();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('business');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (features.length > 0) {
      const found = features.find((f) => f.id === params.id);
      setFeature(found || null);

      if (found) {
        const mod = modules.find((m) => m.id === found.moduleId);
        setModule(mod || null);
      }
    }
  }, [features, modules, params.id]);

  const handleUpdateFeature = async (updates: Partial<Feature>) => {
    if (!feature) return;
    try {
      await updateFeature(feature.id, updates);
      // Update local state optimistically
      setFeature((prev) => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Failed to update feature:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!feature) return;

    try {
      const updatedTasks = feature.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status, ...(status === 'completed' && { completedAt: new Date().toISOString() }) }
          : t
      );

      // Calculate progress
      const completed = updatedTasks.filter((t) => t.status === 'completed').length;
      const inProgress = updatedTasks.filter((t) => t.status === 'in_progress').length;

      await handleUpdateFeature({
        tasks: updatedTasks,
        taskProgress: {
          total: updatedTasks.length,
          completed,
          inProgress,
          pending: updatedTasks.length - completed - inProgress,
          percentComplete: updatedTasks.length > 0
            ? Math.round((completed / updatedTasks.length) * 100)
            : 0,
        },
      });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleUpdateChecklistItem = async (
    itemId: string,
    verified: boolean,
    notes?: string
  ) => {
    if (!feature) return;

    try {
      const updatedChecklist = feature.checklist.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            verified,
            ...(verified && { verifiedAt: new Date().toISOString(), verifiedBy: 'user' as const }),
            notes: notes !== '' ? notes : item.notes,
          };
        }
        return item;
      }) as typeof feature.checklist;

      const verified_count = updatedChecklist.filter((i) => i.verified).length;

      await handleUpdateFeature({
        checklist: updatedChecklist,
        checklistProgress: {
          total: updatedChecklist.length,
          verified: verified_count,
          percentComplete: updatedChecklist.length > 0
            ? Math.round((verified_count / updatedChecklist.length) * 100)
            : 0,
        },
      });
    } catch (error) {
      console.error('Failed to update checklist:', error);
    }
  };

  const handleExportChecklist = async () => {
    if (!feature) return;

    const markdown = `# ${feature.name} - Acceptance Criteria Checklist

${feature.checklist.map((item) => `- [${item.verified ? 'x' : ' '}] ${item.criterion}${item.notes ? `\n  > ${item.notes}` : ''}`).join('\n')}

Verified: ${feature.checklistProgress.verified}/${feature.checklistProgress.total}
Last updated: ${new Date().toISOString()}
`;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(markdown);
      console.log('Checklist copied to clipboard');
    } catch (error) {
      console.error('Failed to copy checklist:', error);
    }
  };

  if (!mounted || loading) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Features', href: '/features' }, { label: 'Loading...' }]} />
        <div className="p-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!feature) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Features', href: '/features' }, { label: 'Not Found' }]} />
        <div className="p-6">
          <EmptyState
            icon={<ChevronLeftIcon className="h-16 w-16" />}
            title="Feature Not Found"
            description="The feature you're looking for doesn't exist."
            action={{
              label: 'Back to Features',
              onClick: () => (window.location.href = '/features'),
            }}
          />
        </div>
      </div>
    );
  }

  const statusColor = {
    draft: 'bg-gray-900/30 text-gray-300',
    in_progress: 'bg-blue-900/30 text-blue-300',
    completed: 'bg-green-900/30 text-green-300',
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Modules', href: '/modules' },
          ...(module ? [{ label: module.name, href: `/modules/${module.id}` }] : []),
          { label: feature.name },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Feature Header */}
        <section className="border-b border-border-default pb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                {feature.name}
              </h1>
              <p className="text-text-secondary max-w-2xl mb-4">
                {feature.description}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-md font-medium ${
                    statusColor[feature.status as keyof typeof statusColor]
                  }`}
                >
                  {feature.status.replace('_', ' ')}
                </span>
                <span className="text-xs px-3 py-1 rounded-md bg-purple-900/30 text-purple-300 font-medium">
                  Phase: {feature.phase}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<EyeIcon className="h-4 w-4" />}
              >
                Preview
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<TrashIcon className="h-4 w-4" />}
              >
                Delete
              </Button>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="border-b border-border-default">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'business', label: 'Business', icon: <DocumentTextIcon className="h-4 w-4" /> },
              { id: 'technical', label: 'Technical', icon: <CodeBracketIcon className="h-4 w-4" /> },
              { id: 'tasks', label: 'Tasks', icon: <ClockIcon className="h-4 w-4" /> },
              { id: 'checklist', label: 'Checklist', icon: <ClipboardDocumentCheckIcon className="h-4 w-4" /> },
              { id: 'history', label: 'History', icon: <DocumentTextIcon className="h-4 w-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'business' && (
            <BusinessSection
              feature={feature}
              onUpdate={handleUpdateFeature}
            />
          )}

          {activeTab === 'technical' && (
            <TechnicalSection feature={feature} />
          )}

          {activeTab === 'tasks' && (
            <TaskList
              tasks={feature.tasks}
              percentComplete={feature.taskProgress.percentComplete}
              onUpdateTaskStatus={handleUpdateTaskStatus}
            />
          )}

          {activeTab === 'checklist' && (
            <Checklist
              items={feature.checklist}
              percentComplete={feature.checklistProgress.percentComplete}
              onUpdateItem={handleUpdateChecklistItem}
              onExport={handleExportChecklist}
            />
          )}

          {activeTab === 'history' && (
            <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Change History
              </h3>
              <p className="text-text-secondary">
                History tracking coming soon. Track changes via git for now.
              </p>
            </div>
          )}
        </div>

        {/* Dependencies Section */}
        {feature.dependencies.length > 0 && (
          <section className="border-t border-border-default pt-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Dependencies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feature.dependencies.map((depId) => {
                const depFeature = features.find((f) => f.id === depId);
                return depFeature ? (
                  <div
                    key={depId}
                    className="p-4 bg-bg-secondary border border-border-default rounded-lg hover:border-accent-primary transition-colors"
                  >
                    <p className="text-sm font-medium text-text-primary">
                      {depFeature.name}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {depFeature.description}
                    </p>
                  </div>
                ) : null;
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
