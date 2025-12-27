/**
 * Plan Button Component
 *
 * Button for navigating to issue planning interface.
 * Shows different states based on plan status:
 * - "Create Plan" (no plan) - teal
 * - "Continue Plan" (in progress) - amber
 * - "View Plan" (completed) - green
 */

'use client';

import Link from 'next/link';
import type { PlanningStatus } from '@/lib/planning/types';

// ============================================================================
// Types
// ============================================================================

export type PlanStatus = 'none' | PlanningStatus;

interface PlanButtonProps {
  projectId: string;
  issueId: string;
  planStatus: PlanStatus;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getPlanButtonConfig(status: PlanStatus): {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hoverBgColor: string;
} {
  switch (status) {
    case 'none':
    case 'not_started':
      return {
        label: 'Create Plan',
        bgColor: 'bg-teal-500/10',
        textColor: 'text-teal-400',
        borderColor: 'border-teal-500/30',
        hoverBgColor: 'hover:bg-teal-500/20',
      };
    case 'requirements':
    case 'clarify':
    case 'technical':
      return {
        label: 'Continue Plan',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
        hoverBgColor: 'hover:bg-amber-500/20',
      };
    case 'completed':
      return {
        label: 'View Plan',
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        hoverBgColor: 'hover:bg-green-500/20',
      };
    case 'failed':
      return {
        label: 'Retry Plan',
        bgColor: 'bg-red-500/10',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        hoverBgColor: 'hover:bg-red-500/20',
      };
    default:
      return {
        label: 'Create Plan',
        bgColor: 'bg-teal-500/10',
        textColor: 'text-teal-400',
        borderColor: 'border-teal-500/30',
        hoverBgColor: 'hover:bg-teal-500/20',
      };
  }
}

// ============================================================================
// Component
// ============================================================================

export function PlanButton({
  projectId,
  issueId,
  planStatus,
  className = '',
}: PlanButtonProps) {
  const config = getPlanButtonConfig(planStatus);

  return (
    <Link
      href={`/projects/${projectId}/issues/${issueId}/plan`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`
        inline-flex items-center gap-1
        px-2 py-0.5
        text-[10px] font-medium font-mono
        rounded border
        transition-colors duration-150
        ${config.bgColor}
        ${config.textColor}
        ${config.borderColor}
        ${config.hoverBgColor}
        ${className}
      `}
    >
      <PlanIcon status={planStatus} />
      {config.label}
    </Link>
  );
}

// ============================================================================
// Icon Component
// ============================================================================

function PlanIcon({ status }: { status: PlanStatus }) {
  // Simple icon based on status
  if (status === 'completed') {
    // Checkmark icon
    return (
      <svg
        className="w-2.5 h-2.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    );
  }

  if (status === 'requirements' || status === 'clarify' || status === 'technical') {
    // In-progress icon (spinner-like)
    return (
      <svg
        className="w-2.5 h-2.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  if (status === 'failed') {
    // Error icon
    return (
      <svg
        className="w-2.5 h-2.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  }

  // Default: create/not started (plus icon)
  return (
    <svg
      className="w-2.5 h-2.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}
