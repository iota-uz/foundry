/**
 * Command Palette Component
 *
 * Production-grade command palette with Linear/Vercel-inspired styling.
 * Features:
 * - Glass-morphism panel with backdrop blur
 * - Large search input with no border
 * - Category headers (Navigation, Actions)
 * - Keyboard shortcuts right-aligned on each item
 * - Footer with navigation hints
 */

'use client';

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { Combobox, Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import {
  BoltIcon,
  ChartBarIcon,
  PlusIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/store';

// =============================================================================
// Types
// =============================================================================

interface Command {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  shortcut?: string;
  category: 'navigation' | 'actions';
  action: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState('');

  // Command definitions
  const commands: Command[] = useMemo(
    () => [
      // Navigation
      {
        id: 'workflows',
        name: 'Go to Workflows',
        description: 'View all workflows',
        icon: BoltIcon,
        shortcut: 'W',
        category: 'navigation',
        action: () => router.push('/'),
      },
      {
        id: 'visualizations',
        name: 'Go to Visualizations',
        description: 'View execution diagrams',
        icon: ChartBarIcon,
        shortcut: 'V',
        category: 'navigation',
        action: () => router.push('/visualizations'),
      },
      // Actions
      {
        id: 'new-workflow',
        name: 'Create New Workflow',
        description: 'Start from scratch',
        icon: PlusIcon,
        shortcut: 'N',
        category: 'actions',
        action: () => router.push('/workflows/new'),
      },
      {
        id: 'duplicate',
        name: 'Duplicate Workflow',
        description: 'Copy current workflow',
        icon: DocumentDuplicateIcon,
        category: 'actions',
        action: () => {
          // TODO: Implement duplication
        },
      },
    ],
    [router]
  );

  // Filter commands
  const filteredCommands =
    query === ''
      ? commands
      : commands.filter(
          (command) =>
            command.name.toLowerCase().includes(query.toLowerCase()) ||
            command.description?.toLowerCase().includes(query.toLowerCase())
        );

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      actions: [],
    };
    filteredCommands.forEach((cmd) => {
      const categoryGroup = groups[cmd.category];
      if (categoryGroup) {
        categoryGroup.push(cmd);
      }
    });
    return groups;
  }, [filteredCommands]);

  const handleSelect = (command: Command | null) => {
    if (command) {
      command.action();
      toggleCommandPalette();
      setQuery('');
    }
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette]);

  // Reset query when closed
  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery('');
    }
  }, [commandPaletteOpen]);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
  };

  return (
    <Transition show={commandPaletteOpen} as={Fragment}>
      <Dialog onClose={toggleCommandPalette} className="relative z-50">
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

        {/* Command palette panel */}
        <div className="fixed inset-0 overflow-y-auto p-4 pt-[15vh]">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95 translate-y-2"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-2"
          >
            <Dialog.Panel
              className={`
                mx-auto max-w-xl
                bg-bg-elevated/95 backdrop-blur-xl
                border border-border-default
                rounded-xl shadow-2xl
                overflow-hidden
              `}
            >
              <Combobox onChange={handleSelect}>
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 h-14">
                  <MagnifyingGlassIcon className="h-5 w-5 text-text-tertiary flex-shrink-0" />
                  <Combobox.Input
                    className={`
                      flex-1 bg-transparent text-base text-text-primary
                      placeholder:text-text-tertiary
                      focus:outline-none
                    `}
                    placeholder="Type a command or search..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    autoFocus
                  />
                  <kbd
                    className={`
                      px-1.5 py-0.5 text-[10px] font-medium
                      text-text-tertiary bg-bg-tertiary
                      border border-border-subtle rounded
                    `}
                  >
                    ESC
                  </kbd>
                </div>

                {/* Divider */}
                <div className="border-t border-border-subtle" />

                {/* Results */}
                {filteredCommands.length > 0 ? (
                  <Combobox.Options
                    static
                    className="max-h-80 overflow-y-auto py-2"
                  >
                    {Object.entries(groupedCommands).map(
                      ([category, cmds]) =>
                        cmds.length > 0 && (
                          <div key={category}>
                            {/* Category header */}
                            <div className="px-4 py-2">
                              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                                {categoryLabels[category]}
                              </span>
                            </div>

                            {/* Commands */}
                            {cmds.map((command) => {
                              const Icon = command.icon;
                              return (
                                <Combobox.Option
                                  key={command.id}
                                  value={command}
                                  className={({ active }) => `
                                    flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg
                                    cursor-pointer transition-colors duration-100
                                    ${active ? 'bg-bg-hover' : ''}
                                  `}
                                >
                                  {({ active }) => (
                                    <>
                                      {/* Icon */}
                                      {Icon && (
                                        <Icon
                                          className={`
                                            h-5 w-5 flex-shrink-0
                                            ${active ? 'text-text-primary' : 'text-text-tertiary'}
                                          `}
                                        />
                                      )}

                                      {/* Content */}
                                      <div className="flex-1 min-w-0">
                                        <div
                                          className={`
                                            text-sm font-medium
                                            ${active ? 'text-text-primary' : 'text-text-secondary'}
                                          `}
                                        >
                                          {command.name}
                                        </div>
                                        {command.description && (
                                          <div className="text-xs text-text-tertiary mt-0.5 truncate">
                                            {command.description}
                                          </div>
                                        )}
                                      </div>

                                      {/* Keyboard shortcut */}
                                      {command.shortcut && (
                                        <kbd
                                          className={`
                                            flex items-center justify-center
                                            w-6 h-6 text-xs font-medium
                                            text-text-tertiary bg-bg-tertiary
                                            border border-border-subtle rounded
                                          `}
                                        >
                                          {command.shortcut}
                                        </kbd>
                                      )}
                                    </>
                                  )}
                                </Combobox.Option>
                              );
                            })}
                          </div>
                        )
                    )}
                  </Combobox.Options>
                ) : query !== '' ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm text-text-secondary">
                      No commands found for &quot;{query}&quot;
                    </p>
                  </div>
                ) : null}

                {/* Footer with hints */}
                <div
                  className={`
                    flex items-center justify-center gap-4
                    px-4 py-2.5 border-t border-border-subtle
                    bg-bg-primary/30
                  `}
                >
                  <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                    <kbd className="px-1 py-0.5 bg-bg-tertiary border border-border-subtle rounded text-[10px]">
                      ↑↓
                    </kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                    <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-subtle rounded text-[10px]">
                      ↵
                    </kbd>
                    <span>Select</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                    <kbd className="px-1 py-0.5 bg-bg-tertiary border border-border-subtle rounded text-[10px]">
                      esc
                    </kbd>
                    <span>Close</span>
                  </div>
                </div>
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
