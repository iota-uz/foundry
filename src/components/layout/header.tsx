/**
 * Header Component
 *
 * Production-grade header with Linear/Vercel-inspired styling.
 * Features:
 * - Compact h-12 height
 * - Refined sidebar toggle with subtle hover
 * - Pill-shaped search trigger with ⌘K keyboard badge
 * - Clean minimal aesthetic
 */

'use client';

import React from 'react';
import { MagnifyingGlassIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useUIStore } from '@/store';
import { UserMenu } from './user-menu';

// =============================================================================
// Component
// =============================================================================

export function Header() {
  const { toggleSidebar, toggleCommandPalette } = useUIStore();

  return (
    <header
      className={`
        flex items-center h-12 px-4
        bg-bg-secondary border-b border-border-default
      `}
    >
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className={`
          p-2 -ml-2 rounded-md
          text-text-tertiary hover:text-text-primary
          hover:bg-bg-hover
          transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
        `}
        aria-label="Toggle sidebar"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Logo / Title */}
      <div className="flex items-center gap-2 ml-2">
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          Foundry
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search trigger (opens command palette) */}
      <button
        onClick={toggleCommandPalette}
        className={`
          flex items-center gap-2 h-8 px-3
          text-sm text-text-tertiary
          bg-bg-tertiary hover:bg-bg-hover
          border border-border-default hover:border-border-hover
          rounded-lg
          transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
        `}
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd
          className={`
            hidden sm:flex items-center gap-0.5
            px-1.5 py-0.5 ml-2
            text-[10px] font-medium text-text-tertiary
            bg-bg-primary border border-border-subtle
            rounded
          `}
        >
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* User menu */}
      <UserMenu />
    </header>
  );
}
