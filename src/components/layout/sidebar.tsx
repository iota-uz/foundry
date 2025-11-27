/**
 * Sidebar navigation component
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  Squares2X2Icon,
  ChartBarIcon,
  CodeBracketSquareIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '@/store';
import { useProjectStore } from '@/store';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Modules', href: '/modules', icon: Squares2X2Icon },
  { name: 'Visualizations', href: '/visualizations', icon: ChartBarIcon },
  { name: 'UI Library', href: '/ui-library', icon: CodeBracketSquareIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUIStore();
  const { modules } = useProjectStore();

  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <aside
      className={`
        flex flex-col h-full
        bg-bg-secondary border-r border-border-default
        transition-all duration-300
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md
                text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-bg-tertiary text-accent-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }
              `}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Module tree */}
        {!sidebarCollapsed && modules.length > 0 && (
          <div className="pt-4 mt-4 border-t border-border-default">
            <h3 className="px-3 mb-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Modules
            </h3>
            <div className="space-y-1">
              {modules.map((module) => {
                const isExpanded = expandedModules.has(module.id);

                return (
                  <div key={module.id}>
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="
                        w-full flex items-center gap-2 px-3 py-2 rounded-md
                        text-sm text-text-secondary
                        hover:bg-bg-tertiary hover:text-text-primary
                        transition-colors
                      "
                    >
                      <ChevronRightIcon
                        className={`h-4 w-4 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                      <span className="flex-1 text-left truncate">{module.name}</span>
                    </button>

                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-1">
                        {/* Features would be rendered here */}
                        <div className="px-3 py-1.5 text-xs text-text-tertiary">
                          {module.features.length} features
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
