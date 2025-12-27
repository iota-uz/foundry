'use client';

/**
 * UI Mockup Viewer
 *
 * Displays component specifications with props tables and HTML previews.
 */

import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  SwatchIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import type { ComponentSpec } from '@/lib/planning/types';

// ============================================================================
// Types
// ============================================================================

interface UIMockupViewerProps {
  mockups: ComponentSpec[];
  className?: string;
}

interface MockupCardProps {
  mockup: ComponentSpec;
  defaultExpanded?: boolean;
}

// ============================================================================
// Type Styling
// ============================================================================

const typeConfig: Record<ComponentSpec['type'], { label: string; color: string }> = {
  page: { label: 'Page', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  component: { label: 'Component', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
};

// ============================================================================
// Props Table
// ============================================================================

function PropsTable({ props }: { props: NonNullable<ComponentSpec['props']> }) {
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-tertiary border-b border-border-subtle">
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Prop
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Type
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Required
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {props.map((prop) => (
            <tr key={prop.name} className="hover:bg-bg-hover/50 transition-colors">
              <td className="px-3 py-2">
                <code className="text-xs font-mono text-accent-primary">{prop.name}</code>
              </td>
              <td className="px-3 py-2">
                <code className="text-xs font-mono text-text-secondary">{prop.type}</code>
              </td>
              <td className="px-3 py-2 text-center">
                {prop.required ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-primary/20 text-accent-primary text-[10px] font-bold">
                    R
                  </span>
                ) : (
                  <span className="text-text-tertiary text-xs">-</span>
                )}
              </td>
              <td className="px-3 py-2 text-text-secondary text-xs">{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// HTML Preview
// ============================================================================

function HTMLPreview({ html }: { html: string }) {
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <div className="px-3 py-2 bg-bg-tertiary border-b border-border-subtle">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          Preview
        </span>
      </div>
      <div
        className="p-4 bg-white min-h-[100px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ============================================================================
// Single Mockup Card
// ============================================================================

function MockupCard({ mockup, defaultExpanded = false }: MockupCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<'props' | 'preview'>('props');

  const config = typeConfig[mockup.type];
  const hasProps = mockup.props && mockup.props.length > 0;
  const hasPreview = mockup.htmlPreview && mockup.htmlPreview.length > 0;

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary overflow-hidden hover:border-border-hover transition-colors">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
          )}

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
            {config.label}
          </span>

          <h3 className="text-sm font-semibold text-text-primary">{mockup.name}</h3>
        </div>

        {/* View toggle */}
        {isExpanded && (hasProps || hasPreview) && (
          <div
            className="flex items-center gap-1 p-0.5 bg-bg-tertiary rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {hasProps && (
              <button
                onClick={() => setViewMode('props')}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'props'
                    ? 'bg-bg-secondary text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <TableCellsIcon className="w-3.5 h-3.5" />
                Props
              </button>
            )}
            {hasPreview && (
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-bg-secondary text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <EyeIcon className="w-3.5 h-3.5" />
                Preview
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border-subtle space-y-4">
          {/* Description */}
          <p className="text-sm text-text-secondary">{mockup.description}</p>

          {/* Props Table */}
          {viewMode === 'props' && hasProps && mockup.props && (
            <PropsTable props={mockup.props} />
          )}

          {/* HTML Preview */}
          {viewMode === 'preview' && hasPreview && mockup.htmlPreview && (
            <HTMLPreview html={mockup.htmlPreview} />
          )}

          {/* No content fallback */}
          {!hasProps && !hasPreview && (
            <div className="py-4 text-center text-text-tertiary text-sm">
              No additional details available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UIMockupViewer({ mockups, className = '' }: UIMockupViewerProps) {
  const [typeFilter, setTypeFilter] = useState<ComponentSpec['type'] | 'all'>('all');

  const filteredMockups = typeFilter === 'all'
    ? mockups
    : mockups.filter((m) => m.type === typeFilter);

  const pageCount = mockups.filter((m) => m.type === 'page').length;
  const componentCount = mockups.filter((m) => m.type === 'component').length;

  if (mockups.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center mb-4">
          <SwatchIcon className="w-6 h-6 text-text-secondary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">No UI mockups yet</h3>
        <p className="text-xs text-text-tertiary max-w-xs">
          Component and page specifications will appear here as the planning identifies UI elements.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-text-secondary">
          <span className="font-bold text-text-primary">{mockups.length}</span> components
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 p-0.5 bg-bg-tertiary rounded-lg">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              typeFilter === 'all'
                ? 'bg-bg-secondary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            All ({mockups.length})
          </button>
          {pageCount > 0 && (
            <button
              onClick={() => setTypeFilter('page')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === 'page'
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Pages ({pageCount})
            </button>
          )}
          {componentCount > 0 && (
            <button
              onClick={() => setTypeFilter('component')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === 'component'
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Components ({componentCount})
            </button>
          )}
        </div>
      </div>

      {/* Mockup list */}
      <div className="space-y-3">
        {filteredMockups.map((mockup, index) => (
          <MockupCard
            key={mockup.id}
            mockup={mockup}
            defaultExpanded={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
