/**
 * Button Component
 *
 * Production-grade button with Linear/Vercel-inspired styling.
 * Features:
 * - Four variants: primary, secondary, ghost, danger
 * - Three sizes: sm, md, lg
 * - Loading state with spinner
 * - Icon support (left/right positioning)
 * - Press feedback with scale animation
 * - Accessible focus states
 */

'use client';

import React from 'react';

// =============================================================================
// Types
// =============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Button content */
  children: React.ReactNode;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
}

// =============================================================================
// Styles
// =============================================================================

const baseStyles = [
  'inline-flex items-center justify-center gap-2',
  'font-medium',
  'border',
  'transition-all duration-150 ease-out',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  'active:scale-[0.98]',
  'select-none',
].join(' ');

const variantStyles = {
  primary: [
    'bg-accent-primary text-white border-transparent',
    'hover:bg-accent-primary-hover',
    'focus-visible:ring-accent-primary',
  ].join(' '),
  secondary: [
    'bg-bg-tertiary text-text-primary border-border-default',
    'hover:bg-bg-hover hover:border-border-hover',
    'focus-visible:ring-border-default',
  ].join(' '),
  ghost: [
    'bg-transparent text-text-secondary border-transparent',
    'hover:bg-bg-tertiary hover:text-text-primary',
    'focus-visible:ring-border-default',
  ].join(' '),
  danger: [
    'bg-accent-error/10 text-accent-error border-accent-error/30',
    'hover:bg-accent-error/20 hover:border-accent-error/50',
    'focus-visible:ring-accent-error',
  ].join(' '),
};

const sizeStyles = {
  sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-md gap-2',
  lg: 'h-10 px-5 text-base rounded-lg gap-2',
};

// =============================================================================
// Loading Spinner
// =============================================================================

function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  disabled,
  icon,
  iconPosition = 'left',
  loading,
  fullWidth,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {icon && !loading && iconPosition === 'left' && icon}
      {children}
      {icon && !loading && iconPosition === 'right' && icon}
    </button>
  );
}
