/**
 * Empty State Component
 *
 * Production-grade empty state with Linear/Vercel-inspired styling.
 * Features:
 * - Centered layout with icon
 * - Title, description, optional action
 * - Size variants: sm, md, lg
 * - Optional secondary action
 */

import React from 'react';
import { Button } from './button';

// =============================================================================
// Types
// =============================================================================

interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
}

interface EmptyStateProps {
  /** Icon to display (e.g., Heroicon) */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action */
  action?: EmptyStateAction;
  /** Secondary action */
  secondaryAction?: EmptyStateAction;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Size Styles
// =============================================================================

const sizeStyles = {
  sm: {
    container: 'py-8 px-4',
    icon: 'mb-3',
    iconSize: 'h-8 w-8',
    title: 'text-sm font-medium',
    description: 'text-xs mt-1 max-w-xs',
    actions: 'mt-4 gap-2',
    buttonSize: 'sm' as const,
  },
  md: {
    container: 'py-12 px-4',
    icon: 'mb-4',
    iconSize: 'h-10 w-10',
    title: 'text-base font-semibold',
    description: 'text-sm mt-1.5 max-w-sm',
    actions: 'mt-6 gap-3',
    buttonSize: 'md' as const,
  },
  lg: {
    container: 'py-16 px-6',
    icon: 'mb-5',
    iconSize: 'h-12 w-12',
    title: 'text-lg font-semibold',
    description: 'text-sm mt-2 max-w-md',
    actions: 'mt-8 gap-3',
    buttonSize: 'md' as const,
  },
};

// =============================================================================
// Component
// =============================================================================

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${styles.container}
        ${className}
      `}
    >
      {/* Icon */}
      {icon && (
        <div
          className={`
            ${styles.icon}
            text-text-tertiary
            [&>svg]:${styles.iconSize}
          `}
        >
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                className: `${styles.iconSize} ${(icon as React.ReactElement<{ className?: string }>).props.className || ''}`,
              })
            : icon}
        </div>
      )}

      {/* Title */}
      <h3 className={`text-text-primary ${styles.title}`}>{title}</h3>

      {/* Description */}
      {description && (
        <p className={`text-text-secondary ${styles.description}`}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className={`flex items-center ${styles.actions}`}>
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'ghost'}
              size={styles.buttonSize}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              variant={action.variant || 'primary'}
              size={styles.buttonSize}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
