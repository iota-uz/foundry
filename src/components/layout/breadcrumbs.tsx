/**
 * Breadcrumbs navigation component
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/20/solid';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 px-6 py-3 border-b border-border-default bg-bg-primary">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRightIcon className="h-4 w-4 text-text-tertiary flex-shrink-0" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`text-sm ${
                  isLast ? 'text-text-primary font-medium' : 'text-text-secondary'
                }`}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
