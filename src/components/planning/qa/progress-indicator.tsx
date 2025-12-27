'use client';

/**
 * Progress Indicator Component
 *
 * Visual representation of batch progress with animated bar.
 * Updated for current design system with modern minimal dark theme.
 */

import { useMemo } from 'react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  label?: string;
}

export function ProgressIndicator({
  current,
  total,
  showPercentage = true,
  animated = true,
  size = 'md',
  variant = 'default',
  label,
}: ProgressIndicatorProps) {
  const percentage = useMemo(
    () => Math.round((current / Math.max(total, 1)) * 100),
    [current, total]
  );

  const heightMap = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantMap = {
    default: 'bg-accent-primary',
    success: 'bg-accent-success',
    warning: 'bg-accent-warning',
    error: 'bg-accent-error',
  };

  const labelMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="mb-1 flex items-center justify-between">
          {label && <span className={`font-medium text-text-secondary ${labelMap[size]}`}>{label}</span>}
          {showPercentage && (
            <span className={`text-text-tertiary ${labelMap[size]}`}>{percentage}%</span>
          )}
        </div>
      )}

      <div className={`w-full overflow-hidden rounded-full bg-bg-tertiary ${heightMap[size]}`}>
        <div
          className={`${heightMap[size]} ${variantMap[variant]} transition-all ${
            animated ? 'duration-300' : ''
          }`}
          style={{
            width: `${percentage}%`,
          }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={label}
        />
      </div>

      {total > 0 && (
        <div className="mt-1 text-xs text-text-tertiary">
          {current} of {total}
        </div>
      )}
    </div>
  );
}
