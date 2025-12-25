/**
 * Sync Button Component
 *
 * Manual sync trigger with last synced timestamp.
 * Features:
 * - Loading spinner during sync
 * - Relative time display
 * - Terminal-inspired styling
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

interface SyncButtonProps {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  onSync: () => void;
}

// ============================================================================
// Relative Time Helper
// ============================================================================

function getRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never synced';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 10) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// Component
// ============================================================================

export function SyncButton({ lastSyncedAt, isSyncing, onSync }: SyncButtonProps) {
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(lastSyncedAt));
  const [showSuccess, setShowSuccess] = useState(false);

  // Update relative time every minute
  useEffect(() => {
    setRelativeTime(getRelativeTime(lastSyncedAt));

    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(lastSyncedAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  // Show success animation after sync
  useEffect(() => {
    if (!isSyncing && lastSyncedAt) {
      setShowSuccess(true);
      const timeout = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isSyncing, lastSyncedAt]);

  return (
    <div className="flex items-center gap-3">
      {/* Last synced indicator */}
      <div className="flex items-center gap-1.5 text-xs font-mono">
        {showSuccess ? (
          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
        <span className="text-text-tertiary">
          {isSyncing ? 'Syncing...' : relativeTime}
        </span>
      </div>

      {/* Sync button */}
      <button
        onClick={onSync}
        disabled={isSyncing}
        className={`
          inline-flex items-center gap-2
          px-3 py-1.5 rounded-lg
          text-sm font-medium
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-bg-tertiary text-text-secondary border border-border-default
          hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5
          focus:outline-none focus:ring-1 focus:ring-emerald-500/50
        `}
      >
        <ArrowPathIcon
          className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
        />
        <span className="font-mono text-xs">
          {isSyncing ? 'syncing' : 'sync'}
        </span>
      </button>
    </div>
  );
}
