/**
 * Toast Component
 *
 * Production-grade toast notification with Linear/Vercel-inspired styling.
 * Features:
 * - Subtle colored borders (not solid backgrounds)
 * - Slide-in animation from right
 * - Close button visible on hover
 * - Support for title + message
 * - Auto-dismiss with configurable duration
 */

import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  /** Toast type determines icon and color */
  type: ToastType;
  /** Optional title (bold) */
  title?: string;
  /** Message content */
  message: string;
  /** Close handler */
  onClose: () => void;
}

// =============================================================================
// Configuration
// =============================================================================

const toastConfig: Record<
  ToastType,
  {
    icon: typeof CheckCircleIcon;
    borderColor: string;
    iconColor: string;
    titleColor: string;
  }
> = {
  success: {
    icon: CheckCircleIcon,
    borderColor: 'border-l-accent-success',
    iconColor: 'text-accent-success',
    titleColor: 'text-accent-success',
  },
  error: {
    icon: ExclamationCircleIcon,
    borderColor: 'border-l-accent-error',
    iconColor: 'text-accent-error',
    titleColor: 'text-accent-error',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    borderColor: 'border-l-accent-warning',
    iconColor: 'text-accent-warning',
    titleColor: 'text-accent-warning',
  },
  info: {
    icon: InformationCircleIcon,
    borderColor: 'border-l-accent-primary',
    iconColor: 'text-accent-primary',
    titleColor: 'text-accent-primary',
  },
};

// =============================================================================
// Component
// =============================================================================

export function Toast({ type, title, message, onClose }: ToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`
        group relative flex items-start gap-3
        min-w-[320px] max-w-md p-4
        bg-bg-elevated border border-border-default ${config.borderColor}
        border-l-2 rounded-lg shadow-lg
        animate-slide-in-right
      `}
      role="alert"
    >
      {/* Icon */}
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-medium ${config.titleColor} mb-0.5`}>
            {title}
          </p>
        )}
        <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
      </div>

      {/* Close button - visible on hover */}
      <button
        onClick={onClose}
        className={`
          flex-shrink-0 p-1 -mr-1 -mt-1 rounded
          text-text-tertiary hover:text-text-primary
          opacity-0 group-hover:opacity-100
          transition-all duration-150
          focus:outline-none focus:opacity-100
        `}
        aria-label="Dismiss notification"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
