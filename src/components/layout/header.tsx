/**
 * Header component with title, search, and actions
 */

'use client';

import React from 'react';
import {
  MagnifyingGlassIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '@/store';

export function Header() {
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

      {/* Title */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-text-primary">Foundry</h1>
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
    </header>
  );
}
