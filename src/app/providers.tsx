/**
 * Client-side providers wrapper
 */

'use client';

import React from 'react';
import { ToastProvider } from '@/components/shared';
import { AppShell } from '@/components/layout';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
