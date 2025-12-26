/**
 * Client-side providers wrapper
 */

'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/shared';
import { AppShell } from '@/components/layout';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </SessionProvider>
  );
}
