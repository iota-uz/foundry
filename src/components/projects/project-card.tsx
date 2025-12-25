/**
 * Project Card Component
 *
 * Displays a project in a card format with GitHub integration indicators.
 * Features:
 * - GitHub project connection status
 * - Repository count badge
 * - Last sync timestamp
 * - Hover effects with gradient glow
 * - Quick action buttons
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { formatRelativeTime } from '@/lib/design-system';
import type { Project } from '@/store/project.store';

// ============================================================================
// GitHub Icon (custom for branding)
// ============================================================================

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

interface ProjectCardProps {
  project: Project;
  onDelete: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function ProjectCard({
  project,
  onDelete,
  onSync,
  isSyncing,
}: ProjectCardProps) {
  const repoCount = project.repos?.length ?? 0;
  const lastSynced = project.lastSyncedAt
    ? formatRelativeTime(new Date(project.lastSyncedAt))
    : 'Never synced';

  return (
    <div
      className={`
        group relative rounded-xl overflow-hidden
        border border-border-default
        bg-bg-secondary
        transition-all duration-200 ease-out
        hover:border-emerald-500/40
        hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]
      `}
    >
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-60" />

      {/* Main content - clickable */}
      <Link href={`/projects/${project.id}`} className="block p-5">
        {/* Header with icon and GitHub badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`
                w-11 h-11 rounded-lg
                bg-gradient-to-br from-emerald-500/20 to-teal-500/10
                border border-emerald-500/30
                flex items-center justify-center
                group-hover:border-emerald-500/50
                transition-colors duration-200
              `}
            >
              <FolderIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div
              className={`
                flex items-center gap-1.5 px-2 py-1
                bg-bg-tertiary rounded-md
                text-xs text-text-secondary
                font-mono
              `}
            >
              <GitHubIcon className="w-3.5 h-3.5" />
              <span>#{project.githubProjectNumber}</span>
            </div>
          </div>
        </div>

        {/* Title and description */}
        <h3 className="font-semibold text-text-primary mb-1.5 truncate text-[15px]">
          {project.name}
        </h3>

        {project.description ? (
          <p className="text-sm text-text-secondary mb-4 line-clamp-2 h-10 leading-relaxed">
            {project.description}
          </p>
        ) : (
          <p className="text-sm text-text-tertiary italic mb-4 h-10">
            No description
          </p>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-3 text-xs">
          {/* Repo count */}
          <span
            className={`
              inline-flex items-center gap-1.5
              px-2.5 py-1 rounded-md
              bg-bg-tertiary text-text-secondary
              font-medium
            `}
          >
            <GitHubIcon className="w-3 h-3" />
            {repoCount} repo{repoCount !== 1 ? 's' : ''}
          </span>

          {/* Last sync */}
          <span className="flex items-center gap-1 text-text-tertiary">
            <ClockIcon className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{lastSynced}</span>
          </span>
        </div>
      </Link>

      {/* Actions - visible on hover */}
      <div
        className={`
          absolute top-4 right-4
          flex items-center gap-1
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
        `}
      >
        {onSync && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSync();
            }}
            disabled={isSyncing}
            className={`
              p-1.5 rounded-md cursor-pointer
              text-text-secondary hover:text-emerald-400
              hover:bg-emerald-500/10
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title="Sync with GitHub"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
            />
          </button>
        )}
        <Link
          href={`/projects/${project.id}/settings`}
          className={`
            p-1.5 rounded-md cursor-pointer
            text-text-secondary hover:text-text-primary
            hover:bg-bg-hover
            transition-colors
          `}
          title="Settings"
          onClick={(e) => e.stopPropagation()}
        >
          <Cog6ToothIcon className="w-4 h-4" />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className={`
            p-1.5 rounded-md cursor-pointer
            text-text-secondary hover:text-accent-error
            hover:bg-accent-error/10
            transition-colors
          `}
          title="Delete project"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
