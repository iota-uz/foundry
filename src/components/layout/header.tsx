/**
 * Header component with project name, search, and actions
 */

'use client';

import React from 'react';
import {
  MagnifyingGlassIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { useProjectStore, useUIStore } from '@/store';

export function Header() {
  const { project } = useProjectStore();
  const { toggleSidebar, toggleCommandPalette } = useUIStore();

  return (
    <header className="flex items-center gap-4 px-6 py-3 bg-bg-secondary border-b border-border-default">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
        aria-label="Toggle sidebar"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Project name */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-text-primary">
          {project?.name || 'Foundry'}
        </h1>
        {project && (
          <span className="px-2 py-0.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded">
            {project.phase.toUpperCase()}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search button (opens command palette) */}
      <button
        onClick={toggleCommandPalette}
        className="
          flex items-center gap-2 px-3 py-1.5
          text-sm text-text-secondary
          bg-bg-tertiary hover:bg-[#333333]
          border border-border-default
          rounded-md transition-colors
        "
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span>Search</span>
        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-bg-primary border border-border-default rounded">
          ⌘K
        </kbd>
      </button>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Undo"
          disabled
        >
          <ArrowUturnLeftIcon className="h-5 w-5" />
        </button>
        <button
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Redo"
          disabled
        >
          <ArrowUturnRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Git branch indicator */}
      {project && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary bg-bg-tertiary rounded-md">
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
          </svg>
          <span>{project.settings.defaultBranch}</span>
        </div>
      )}
    </header>
  );
}
