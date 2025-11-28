'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/layout';
import {
  ConstitutionEditor,
  ApiKeySetup,
  LessonsLearned,
} from '@/components/settings';
import {
  CogIcon,
  ShieldCheckIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

type SettingsTab = 'api-key' | 'constitution' | 'lessons';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api-key');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const tabs: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'api-key',
      label: 'API Key',
      icon: <ShieldCheckIcon className="h-5 w-5" />,
    },
    {
      id: 'constitution',
      label: 'Constitution',
      icon: <CogIcon className="h-5 w-5" />,
    },
    {
      id: 'lessons',
      label: 'Lessons Learned',
      icon: <BookOpenIcon className="h-5 w-5" />,
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Settings' }]} />

      <div className="p-6">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Settings
          </h1>
          <p className="text-text-secondary">
            Configure your project settings, API credentials, and preferences.
          </p>
        </div>

        {/* Tabs navigation */}
        <div className="border-b border-border-default mb-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                  ${
                    activeTab === tab.id
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

        {/* Tab content */}
        <div className="max-w-4xl">
          {activeTab === 'api-key' && <ApiKeySetup />}
          {activeTab === 'constitution' && <ConstitutionEditor />}
          {activeTab === 'lessons' && <LessonsLearned />}
        </div>
      </div>
    </div>
  );
}
