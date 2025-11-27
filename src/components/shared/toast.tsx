/**
 * Toast notification component
 */

import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-accent-success/10',
    borderColor: 'border-accent-success',
    iconColor: 'text-accent-success',
  },
  error: {
    icon: XCircleIcon,
    bgColor: 'bg-accent-error/10',
    borderColor: 'border-accent-error',
    iconColor: 'text-accent-error',
  },
  warning: {
    icon: ExclamationCircleIcon,
    bgColor: 'bg-accent-warning/10',
    borderColor: 'border-accent-warning',
    iconColor: 'text-accent-warning',
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-accent-primary/10',
    borderColor: 'border-accent-primary',
    iconColor: 'text-accent-primary',
  },
};

export function Toast({ type, message, onClose }: ToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 min-w-[320px] max-w-md
        ${config.bgColor} ${config.borderColor}
        border rounded-lg shadow-lg
        animate-in slide-in-from-right duration-300
      `}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
      <p className="flex-1 text-sm text-text-primary">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
