/**
 * Modal Component
 *
 * Production-grade modal dialog with Linear/Vercel-inspired styling.
 * Built on Headless UI Dialog for full accessibility.
 * Features:
 * - Backdrop blur with 60% opacity
 * - Scale animation on open/close
 * - Clean header with title/description
 * - Close button with subtle hover
 * - ModalFooter subcomponent for action buttons
 */

'use client';

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show close button */
  showClose?: boolean;
}

// =============================================================================
// Size Styles
// =============================================================================

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

// =============================================================================
// Component
// =============================================================================

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
}: ModalProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`
                  w-full ${sizeStyles[size]}
                  bg-bg-secondary border border-border-default
                  rounded-xl shadow-xl
                  transform transition-all
                `}
              >
                {/* Header */}
                {((title !== undefined && title !== null && title !== '') || showClose === true) && (
                  <div className="flex items-start justify-between px-5 py-4 border-b border-border-subtle">
                    <div className="flex-1 min-w-0">
                      {title !== undefined && title !== null && title !== '' && (
                        <Dialog.Title className="text-base font-semibold text-text-primary">
                          {title}
                        </Dialog.Title>
                      )}
                      {description !== undefined && description !== null && description !== '' && (
                        <Dialog.Description className="mt-1 text-sm text-text-secondary">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {showClose && (
                      <button
                        onClick={onClose}
                        className={`
                          flex-shrink-0 p-1.5 -mr-1.5 rounded-md ml-4
                          text-text-tertiary hover:text-text-primary
                          hover:bg-bg-tertiary
                          transition-all duration-150
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
                        `}
                        aria-label="Close modal"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="px-5 py-4">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// =============================================================================
// Modal Footer Subcomponent
// =============================================================================

interface ModalFooterProps {
  children: React.ReactNode;
  /** Border on top */
  bordered?: boolean;
}

export function ModalFooter({ children, bordered = true }: ModalFooterProps) {
  return (
    <div
      className={`
        flex items-center justify-end gap-3 px-5 py-4
        ${bordered ? 'border-t border-border-subtle' : ''}
        bg-bg-primary/30
      `}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Modal Body Subcomponent (for scrollable content)
// =============================================================================

interface ModalBodyProps {
  children: React.ReactNode;
  /** Maximum height before scrolling */
  maxHeight?: string;
}

export function ModalBody({ children, maxHeight = 'max-h-[60vh]' }: ModalBodyProps) {
  return (
    <div className={`px-5 py-4 overflow-y-auto ${maxHeight}`}>
      {children}
    </div>
  );
}
