/**
 * Command palette for quick navigation and actions
 */

'use client';

import React, { Fragment, useState, useEffect } from 'react';
import { Combobox, Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/store';

interface Command {
  id: string;
  name: string;
  description?: string;
  action: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState('');

  // Build command list
  const commands: Command[] = [
    {
      id: 'workflows',
      name: 'Go to Workflows',
      description: 'View all workflows',
      action: () => router.push('/'),
    },
    {
      id: 'visualizations',
      name: 'Go to Visualizations',
      description: 'View execution diagrams',
      action: () => router.push('/visualizations'),
    },
    {
      id: 'ui-library',
      name: 'Go to UI Library',
      description: 'View component gallery',
      action: () => router.push('/ui-library'),
    },
  ];

  const filteredCommands =
    query === ''
      ? commands
      : commands.filter((command) =>
          command.name.toLowerCase().includes(query.toLowerCase())
        );

  const handleSelect = (command: Command) => {
    command.action();
    toggleCommandPalette();
    setQuery('');
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

  return (
    <Transition show={commandPaletteOpen} as={Fragment}>
      <Dialog onClose={toggleCommandPalette} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        {/* Command palette panel */}
        <div className="fixed inset-0 overflow-y-auto p-4 pt-[20vh]">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden">
              <Combobox onChange={handleSelect}>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
                  <MagnifyingGlassIcon className="h-5 w-5 text-text-tertiary" />
                  <Combobox.Input
                    className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none"
                    placeholder="Search commands..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    autoFocus
                  />
                </div>

                {filteredCommands.length > 0 && (
                  <Combobox.Options static className="max-h-96 overflow-y-auto py-2">
                    {filteredCommands.map((command) => (
                      <Combobox.Option
                        key={command.id}
                        value={command}
                        className={({ active }) =>
                          `px-4 py-2 cursor-pointer ${active ? 'bg-bg-tertiary' : ''}`
                        }
                      >
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {command.name}
                          </div>
                          {command.description && (
                            <div className="text-xs text-text-secondary mt-0.5">
                              {command.description}
                            </div>
                          )}
                        </div>
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                )}

                {query !== '' && filteredCommands.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-text-secondary">
                    No commands found.
                  </div>
                )}
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
