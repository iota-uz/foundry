'use client';

import React from 'react';
import {
  DocumentPlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface ChangesListProps {
  changes: Array<{
    status: 'A' | 'M' | 'D'; // Added, Modified, Deleted
    path: string;
  }>;
  isLoading?: boolean;
}

const STATUS_CONFIG = {
  A: {
    label: 'Added',
    icon: DocumentPlusIcon,
    color: 'text-accent-success',
    bgColor: 'bg-accent-success/10',
  },
  M: {
    label: 'Modified',
    icon: PencilIcon,
    color: 'text-accent-warning',
    bgColor: 'bg-accent-warning/10',
  },
  D: {
    label: 'Deleted',
    icon: TrashIcon,
    color: 'text-accent-error',
    bgColor: 'bg-accent-error/10',
  },
};

export function ChangesList({ changes, isLoading = false }: ChangesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-bg-tertiary rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="p-4 text-center text-text-secondary text-sm">
        No changes
      </div>
    );
  }

  // Group changes by status
  const grouped = changes.reduce(
    (acc, change) => {
      if (!acc[change.status]) {
        acc[change.status] = [];
      }
      const array = acc[change.status];
      if (array) {
        array.push(change);
      }
      return acc;
    },
    {} as Record<string, typeof changes>
  );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([status, statusChanges]) => {
        const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
        if (config === undefined) {
          return null;
        }
        const IconComponent = config.icon;

        return (
          <div key={status}>
            <h4 className="text-xs font-semibold text-text-secondary mb-2">
              {config.label} ({statusChanges.length})
            </h4>
            <div className="space-y-1">
              {statusChanges.map((change, idx) => (
                <div
                  key={`${change.path}-${idx}`}
                  className="flex items-start gap-2 p-2 rounded hover:bg-bg-tertiary transition-colors cursor-pointer group"
                  title={change.path}
                >
                  <IconComponent className={`h-4 w-4 flex-shrink-0 ${config.color} mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <code className="text-xs text-text-primary truncate block group-hover:text-accent-primary transition-colors">
                      {change.path}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
