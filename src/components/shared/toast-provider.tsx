/**
 * Toast notification context and provider
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, type ToastType } from './toast';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: ToastMessage = {
        id,
        type,
        message,
        ...(duration !== undefined && { duration })
      };

      setToasts((prev) => [...prev.slice(-2), toast]); // Keep max 3 toasts

      // Auto-dismiss
      const autoDismissDuration = duration || (type === 'error' ? 5000 : 3000);
      setTimeout(() => {
        removeToast(id);
      }, autoDismissDuration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
