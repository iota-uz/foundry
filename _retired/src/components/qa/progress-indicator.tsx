'use client';

/**
 * Progress Indicator Component
 *
 * Visual representation of batch progress with animated bar.
 * Used in F14 - Smart Question Batching.
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
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    error: 'bg-red-600',
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
          {label && <span className={`font-medium text-gray-300 ${labelMap[size]}`}>{label}</span>}
          {showPercentage && (
            <span className={`text-gray-400 ${labelMap[size]}`}>{percentage}%</span>
          )}
        </div>
      )}

      <div className={`w-full overflow-hidden rounded-full bg-gray-800 ${heightMap[size]}`}>
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
        <div className="mt-1 text-xs text-gray-500">
          {current} of {total}
        </div>
      )}
    </div>
  );
}
