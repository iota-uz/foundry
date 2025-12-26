/**
 * Node Analytics Component
 *
 * Performance metrics table for workflow nodes.
 * Features:
 * - Sortable columns
 * - Failure rate highlighting
 * - Duration formatting
 * - Loading skeleton
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Skeleton, EmptyState } from '@/components/shared';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface NodeAnalytic {
  nodeId: string;
  nodeType: string;
  avgDurationMs: number;
  successRate: number;
  totalRuns: number;
  failureCount: number;
}

type SortField = 'nodeId' | 'nodeType' | 'avgDurationMs' | 'successRate' | 'totalRuns' | 'failureCount';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// Helper Functions
// =============================================================================

function formatDuration(ms: number): string {
  if (ms === 0) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

function getNodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    agent: 'Agent',
    command: 'Command',
    'slash-command': 'Slash Command',
    eval: 'Eval',
    http: 'HTTP',
    llm: 'LLM',
    'dynamic-agent': 'Dynamic Agent',
    'dynamic-command': 'Dynamic Command',
    'github-project': 'GitHub Project',
  };
  return labels[type.toLowerCase()] ?? type;
}

function getNodeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    agent: 'text-purple-400 bg-purple-500/10',
    command: 'text-green-400 bg-green-500/10',
    'slash-command': 'text-yellow-400 bg-yellow-500/10',
    eval: 'text-blue-400 bg-blue-500/10',
    http: 'text-cyan-400 bg-cyan-500/10',
    llm: 'text-pink-400 bg-pink-500/10',
    'dynamic-agent': 'text-orange-400 bg-orange-500/10',
    'dynamic-command': 'text-red-400 bg-red-500/10',
    'github-project': 'text-violet-400 bg-violet-500/10',
  };
  return colors[type.toLowerCase()] ?? 'text-text-tertiary bg-bg-tertiary';
}

// =============================================================================
// Table Header Component
// =============================================================================

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentSort: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  align?: 'left' | 'right';
}

function SortableHeader({
  label,
  field,
  currentSort,
  direction,
  onSort,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <th
      className={`
        py-2.5 px-4 cursor-pointer select-none
        text-xs font-medium text-text-tertiary uppercase tracking-wide
        transition-colors hover:text-text-secondary
        ${align === 'right' ? 'text-right' : 'text-left'}
      `}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        <span className="flex flex-col">
          <ChevronUpIcon
            className={`w-3 h-3 -mb-1 ${
              isActive && direction === 'asc' ? 'text-accent-primary' : 'text-text-muted'
            }`}
          />
          <ChevronDownIcon
            className={`w-3 h-3 ${
              isActive && direction === 'desc' ? 'text-accent-primary' : 'text-text-muted'
            }`}
          />
        </span>
      </div>
    </th>
  );
}

// =============================================================================
// Skeleton Components
// =============================================================================

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border-subtle">
      <td className="py-3 px-4"><Skeleton className="w-40 h-4" /></td>
      <td className="py-3 px-4"><Skeleton className="w-20 h-5 rounded" /></td>
      <td className="py-3 px-4 text-right"><Skeleton className="w-16 h-4 ml-auto" /></td>
      <td className="py-3 px-4 text-right"><Skeleton className="w-14 h-4 ml-auto" /></td>
      <td className="py-3 px-4 text-right"><Skeleton className="w-12 h-4 ml-auto" /></td>
      <td className="py-3 px-4 text-right"><Skeleton className="w-10 h-4 ml-auto" /></td>
    </tr>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function NodeAnalytics() {
  const [analytics, setAnalytics] = useState<NodeAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalRuns');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/visualizations/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics');

        const data = await response.json() as { nodes?: NodeAnalytic[] };
        setAnalytics(data.nodes !== undefined ? data.nodes : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void fetchAnalytics();
  }, []);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort data
  const sortedAnalytics = useMemo(() => {
    return [...analytics].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aNum = Number(aValue) || 0;
      const bNum = Number(bValue) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [analytics, sortField, sortDirection]);

  if (error !== null && error !== '') {
    return (
      <div className="p-6">
        <div className="bg-accent-error/10 border border-accent-error/30 rounded-lg p-4">
          <p className="text-accent-error text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">
            Node Performance Metrics
          </h3>
          {!loading && analytics.length > 0 && (
            <p className="text-xs text-text-tertiary">
              {analytics.length} nodes analyzed
            </p>
          )}
        </div>

        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-tertiary/30">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">Node ID</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">Type</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">Avg Duration</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">Success</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">Runs</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">Failures</th>
              </tr>
            </thead>
            <tbody>
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </tbody>
          </table>
        ) : analytics.length === 0 ? (
          <EmptyState
            icon={<CpuChipIcon />}
            title="No node data yet"
            description="Execute workflows to see node performance metrics."
            size="sm"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-tertiary/30">
                  <SortableHeader
                    label="Node ID"
                    field="nodeId"
                    currentSort={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Type"
                    field="nodeType"
                    currentSort={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Avg Duration"
                    field="avgDurationMs"
                    currentSort={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Success"
                    field="successRate"
                    currentSort={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Runs"
                    field="totalRuns"
                    currentSort={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Failures"
                    field="failureCount"
                    currentSort={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {sortedAnalytics.map((node) => {
                  const hasHighFailureRate = node.successRate < 80 && node.totalRuns > 0;
                  const typeColor = getNodeTypeColor(node.nodeType);

                  return (
                    <tr
                      key={node.nodeId}
                      className={`
                        border-b border-border-subtle last:border-b-0
                        transition-colors duration-100
                        ${hasHighFailureRate ? 'bg-accent-error/5 hover:bg-accent-error/10' : 'hover:bg-bg-hover/50'}
                      `}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {hasHighFailureRate && (
                            <ExclamationTriangleIcon className="w-4 h-4 text-accent-error flex-shrink-0" />
                          )}
                          <span className="text-sm font-mono text-text-primary truncate max-w-[200px]">
                            {node.nodeId}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`
                            inline-flex px-2 py-0.5 rounded text-xs font-medium
                            ${typeColor}
                          `}
                        >
                          {getNodeTypeLabel(node.nodeType)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-text-secondary font-mono">
                          {formatDuration(node.avgDurationMs)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`
                            text-sm font-medium
                            ${
                              node.successRate >= 90
                                ? 'text-accent-success'
                                : node.successRate >= 70
                                  ? 'text-accent-warning'
                                  : 'text-accent-error'
                            }
                          `}
                        >
                          {node.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-text-secondary">
                          {node.totalRuns.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`
                            text-sm font-mono
                            ${node.failureCount > 0 ? 'text-accent-error' : 'text-text-tertiary'}
                          `}
                        >
                          {node.failureCount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
