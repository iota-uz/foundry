/**
 * Skeleton Component
 *
 * Production-grade loading skeleton with Linear/Vercel-inspired styling.
 * Features:
 * - Shimmer animation (not pulse)
 * - Multiple variants: text, circular, rectangular
 * - Preset components: SkeletonText, SkeletonCard, SkeletonButton
 * - Composable for custom layouts
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular';
  /** Width (for inline styles) */
  width?: string | number;
  /** Height (for inline styles) */
  height?: string | number;
}

// =============================================================================
// Base Skeleton
// =============================================================================

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={`
        bg-bg-tertiary
        animate-shimmer
        ${variantStyles[variant]}
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}

// =============================================================================
// Skeleton Text
// =============================================================================

interface SkeletonTextProps {
  /** Number of lines to show */
  lines?: number;
  /** Gap between lines */
  gap?: 'sm' | 'md' | 'lg';
}

export function SkeletonText({ lines = 3, gap = 'sm' }: SkeletonTextProps) {
  const gapStyles = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
  };

  return (
    <div className={gapStyles[gap]} aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Skeleton Card
// =============================================================================

interface SkeletonCardProps {
  /** Show avatar placeholder */
  showAvatar?: boolean;
  /** Number of text lines */
  lines?: number;
}

export function SkeletonCard({ showAvatar = true, lines = 2 }: SkeletonCardProps) {
  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-lg">
      {showAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="circular" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-1/3 h-3" />
            <Skeleton className="w-1/2 h-3" />
          </div>
        </div>
      )}
      <SkeletonText lines={lines} />
    </div>
  );
}
