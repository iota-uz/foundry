'use client';

import React from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  ChartBarIcon,
  CodeBracketSquareIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface QuickActionsProps {
  projectPhase: string;
  onNewFeature?: () => void;
  onNewModule?: () => void;
  onStartCPO?: () => void;
  onStartCTO?: () => void;
  disabled?: boolean;
}

export function QuickActions({
  projectPhase,
  onNewFeature,
  onNewModule,
  onStartCPO,
  onStartCTO,
  disabled = false,
}: QuickActionsProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {onNewFeature && (
          <ActionButton
            icon={<PlusIcon className="h-6 w-6" />}
            title="New Feature"
            description="Add a new feature"
            onClick={onNewFeature}
          />
        )}

        {onNewModule && (
          <ActionButton
            icon={<PlusIcon className="h-6 w-6" />}
            title="New Module"
            description="Create a new module"
            onClick={onNewModule}
          />
        )}

        <ActionLink
          icon={<ChartBarIcon className="h-6 w-6" />}
          title="Visualizations"
          description="View schemas & APIs"
          href="/visualizations"
        />

        <ActionLink
          icon={<CodeBracketSquareIcon className="h-6 w-6" />}
          title="UI Library"
          description="Browse components"
          href="/ui-library"
        />

        <ActionLink
          icon={<ArrowPathIcon className="h-6 w-6" />}
          title="Git Panel"
          description="View Git status"
          href="/git"
        />

        {projectPhase === 'cpo' && onStartCPO && (
          <ActionButton
            icon={<SparklesIcon className="h-6 w-6" />}
            title="Start CPO Phase"
            description="Begin Q&A"
            onClick={onStartCPO}
            disabled={disabled}
          />
        )}

        {projectPhase === 'cto' && onStartCTO && (
          <ActionButton
            icon={<SparklesIcon className="h-6 w-6" />}
            title="Start CTO Phase"
            description="Technical Q&A"
            onClick={onStartCTO}
            disabled={disabled}
          />
        )}
      </div>
    </section>
  );
}

function ActionButton({
  icon,
  title,
  description,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        p-4 text-left
        bg-bg-secondary border border-border-default
        rounded-lg transition-colors
        hover:border-accent-primary hover:bg-bg-tertiary
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      <div className="text-accent-primary mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary">{description}</p>
    </button>
  );
}

function ActionLink({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="
        p-4 text-left
        bg-bg-secondary border border-border-default
        rounded-lg transition-colors
        hover:border-accent-primary hover:bg-bg-tertiary
      "
    >
      <div className="text-accent-primary mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary">{description}</p>
    </Link>
  );
}
