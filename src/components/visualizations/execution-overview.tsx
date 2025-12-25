/**
 * Execution Overview Component
 *
 * Dashboard displaying workflow execution statistics and recent executions.
 * Features:
 * - Stats cards with metrics
 * - Recent executions table
 * - Status badges with color coding
 * - Loading skeletons
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/shared';
import { EmptyState } from '@/components/shared';
import { getStatusColor, formatRelativeTime } from '@/lib/design-system';
import {
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface ExecutionStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  paused: number;
  successRate: number;
  avgDurationMs: number;
}

interface Execution {
  id: string;
  workflowId: string;
  workflowName: string | null;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  currentNode: string;
  startedAt: string;
  completedAt: string | null;
}

// =============================================================================
// Stats Card Component
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string | undefined;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor: string;
  trend?: 'up' | 'down' | 'neutral' | undefined;
}

function StatCard({ label, value, subValue, icon: Icon, iconColor }: StatCardProps) {
  return (
    <div
      className="
        relative overflow-hidden
        bg-bg-secondary border border-border-default rounded-lg p-4
        transition-all duration-150 ease-out
        hover:border-border-hover hover:bg-bg-hover/30
      "
    >
      {/* Background accent */}
      <div
        className={`
          absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-5
          ${iconColor.replace('text-', 'bg-')}
        `}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1.5">
            {label}
          </p>
          <p className="text-2xl font-semibold text-text-primary tracking-tight">
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-text-tertiary mt-1">{subValue}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-bg-tertiary ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Status Badge Component
// =============================================================================

interface StatusBadgeProps {
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusColor(status);

  const labels: Record<string, string> = {
    pending: 'Pending',
    running: 'Running',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-0.5 rounded-full
        text-xs font-medium
        ${config.bgColor} ${config.textColor}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${status === 'running' ? 'animate-pulse' : ''}`} />
      {labels[status]}
    </span>
  );
}

// =============================================================================
// Skeleton Components
// =============================================================================

function StatCardSkeleton() {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <Skeleton className="w-20 h-3 mb-3" />
      <Skeleton className="w-16 h-7 mb-1" />
      <Skeleton className="w-24 h-3" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border-subtle">
      <td className="py-3 px-4">
        <Skeleton className="w-32 h-4" />
      </td>
      <td className="py-3 px-4">
        <Skeleton className="w-20 h-5 rounded-full" />
      </td>
      <td className="py-3 px-4">
        <Skeleton className="w-16 h-4" />
      </td>
      <td className="py-3 px-4">
        <Skeleton className="w-20 h-4" />
      </td>
    </tr>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

function calculateDuration(startedAt: string, completedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  return formatDuration(end - start);
}

// =============================================================================
// Main Component
// =============================================================================

export function ExecutionOverview() {
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [statsRes, executionsRes] = await Promise.all([
          fetch('/api/visualizations/stats'),
          fetch('/api/visualizations/executions?limit=10'),
        ]);

        if (!statsRes.ok || !executionsRes.ok) {
          throw new Error('Failed to fetch visualization data');
        }

        const statsData = await statsRes.json();
        const executionsData = await executionsRes.json();

        setStats(statsData);
        setExecutions(executionsData.executions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-accent-error/10 border border-accent-error/30 rounded-lg p-4">
          <p className="text-accent-error text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              label="Total Executions"
              value={stats.total.toLocaleString()}
              icon={PlayIcon}
              iconColor="text-accent-primary"
            />
            <StatCard
              label="Success Rate"
              value={`${stats.successRate.toFixed(1)}%`}
              subValue={`${stats.completed} completed`}
              icon={ArrowTrendingUpIcon}
              iconColor="text-accent-success"
            />
            <StatCard
              label="Avg Duration"
              value={formatDuration(stats.avgDurationMs)}
              icon={ClockIcon}
              iconColor="text-accent-warning"
            />
            <StatCard
              label="Currently Running"
              value={stats.running}
              subValue={stats.paused > 0 ? `${stats.paused} paused` : undefined}
              icon={stats.running > 0 ? CheckCircleIcon : XCircleIcon}
              iconColor={stats.running > 0 ? 'text-accent-success' : 'text-text-tertiary'}
            />
          </>
        ) : null}
      </div>

      {/* Recent Executions */}
      <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-medium text-text-primary">
            Recent Executions
          </h3>
        </div>

        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-tertiary/30">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Workflow
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Duration
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Started
                </th>
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
        ) : executions.length === 0 ? (
          <EmptyState
            title="No executions yet"
            description="Run a workflow to see execution history here."
            size="sm"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-tertiary/30">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Workflow
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Duration
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Started
                </th>
              </tr>
            </thead>
            <tbody>
              {executions.map((execution) => (
                <tr
                  key={execution.id}
                  className="
                    border-b border-border-subtle last:border-b-0
                    transition-colors duration-100
                    hover:bg-bg-hover/50
                  "
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/workflows/${execution.workflowId}`}
                      className="text-sm font-medium text-text-primary hover:text-accent-primary transition-colors"
                    >
                      {execution.workflowName || 'Unnamed Workflow'}
                    </Link>
                    <p className="text-xs text-text-tertiary mt-0.5 font-mono">
                      {execution.currentNode}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={execution.status} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-text-secondary font-mono">
                      {calculateDuration(execution.startedAt, execution.completedAt)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-text-tertiary">
                      {formatRelativeTime(new Date(execution.startedAt))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
