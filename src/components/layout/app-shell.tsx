/**
 * Main application shell with layout structure
 */

'use client';

import React from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { CommandPalette } from './command-palette';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <Header />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Command palette */}
      <CommandPalette />
    </div>
  );
}
