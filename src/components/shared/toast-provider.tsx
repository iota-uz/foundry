/**
 * Toast Provider
 *
 * Context provider for toast notifications.
 * Features:
 * - Global toast state management
 * - Max 3 toasts visible at once
 * - Auto-dismiss with configurable duration
 * - Different durations for error vs other types
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, type ToastType } from './toast';

// =============================================================================
// Types
// =============================================================================

interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  /** Show a toast notification */
  showToast: (
    type: ToastType,
    message: string,
    options?: { title?: string; duration?: number }
  ) => void;
  /** Remove a specific toast */
  removeToast: (id: string) => void;
}

// =============================================================================
// Context
// =============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// =============================================================================
// Provider
// =============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      type: ToastType,
      message: string,
      options?: { title?: string; duration?: number }
    ) => {
      const id = Math.random().toString(36).substring(2, 11);
      const toast: ToastMessage = {
        id,
        type,
        message,
        ...(options?.title !== undefined && options.title !== null && options.title !== '' && { title: options.title }),
        ...(options?.duration !== undefined && { duration: options.duration }),
      };

      // Keep max 3 toasts
      setToasts((prev) => [...prev.slice(-2), toast]);

      // Auto-dismiss (errors get longer duration)
      const autoDismissDuration =
        options?.duration ?? (type === 'error' ? 5000 : 3000);
      setTimeout(() => {
        removeToast(id);
      }, autoDismissDuration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Toast container - bottom right */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            {...(toast.title !== undefined && toast.title !== '' ? { title: toast.title } : {})}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
