/**
 * Sidebar Component
 *
 * Production-grade sidebar with Linear/Vercel-inspired styling.
 * Features:
 * - Smooth width transition on collapse
 * - Active nav item with left accent bar
 * - Subtle hover states
 * - Tooltip on collapsed items
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BoltIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useUIStore } from '@/store';

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  shortcut?: string;
}

// =============================================================================
// Navigation Items
// =============================================================================

const navItems: NavItem[] = [
  {
    name: 'Workflows',
    href: '/',
    icon: BoltIcon,
    shortcut: 'W',
  },
  {
    name: 'Visualizations',
    href: '/visualizations',
    icon: ChartBarIcon,
    shortcut: 'V',
  },
];

// =============================================================================
// Component
// =============================================================================

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUIStore();

  return (
    <aside
      className={`
        flex flex-col h-full
        bg-bg-secondary border-r border-border-default
        transition-[width] duration-200 ease-out
        ${sidebarCollapsed ? 'w-14' : 'w-56'}
      `}
    >
      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex items-center gap-3
                h-9 px-2.5 rounded-md
                text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? 'bg-bg-hover text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }
              `}
              title={sidebarCollapsed ? item.name : undefined}
            >
              {/* Active indicator - left accent bar */}
              {isActive && (
                <div
                  className={`
                    absolute left-0 top-1/2 -translate-y-1/2
                    w-0.5 h-4 bg-accent-primary rounded-full
                  `}
                />
              )}

              {/* Icon */}
              <Icon
                className={`
                  h-5 w-5 flex-shrink-0
                  ${isActive ? 'text-accent-primary' : ''}
                `}
              />

              {/* Label */}
              {!sidebarCollapsed && (
                <span className="flex-1 truncate">{item.name}</span>
              )}

              {/* Keyboard shortcut (shown on hover when expanded) */}
              {!sidebarCollapsed && item.shortcut && (
                <kbd
                  className={`
                    hidden group-hover:flex
                    items-center justify-center
                    w-5 h-5 text-[10px] font-medium
                    text-text-tertiary bg-bg-tertiary
                    border border-border-subtle rounded
                  `}
                >
                  {item.shortcut}
                </kbd>
              )}

              {/* Tooltip when collapsed */}
              {sidebarCollapsed && (
                <div
                  className={`
                    absolute left-full ml-2 px-2 py-1
                    text-xs font-medium text-text-primary
                    bg-bg-elevated border border-border-default
                    rounded shadow-lg
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition-all duration-150
                    whitespace-nowrap z-50
                  `}
                >
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer section (optional) */}
      <div className="px-2 py-3 border-t border-border-subtle">
        <div
          className={`
            flex items-center gap-2 px-2.5 h-9
            text-xs text-text-tertiary
            ${sidebarCollapsed ? 'justify-center' : ''}
          `}
        >
          {!sidebarCollapsed && (
            <span className="truncate">Foundry v1.0</span>
          )}
        </div>
      </div>
    </aside>
  );
}
