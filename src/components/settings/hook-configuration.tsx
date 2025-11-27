'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shared';
import type { AgentHooks, HookActionType } from '@/types/domain/constitution';
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface HookConfigurationProps {
  hooks: AgentHooks;
  onChange: (hooks: AgentHooks) => void;
}

const AVAILABLE_EVENTS = [
  { id: 'onFeatureSave', label: 'On Feature Save', description: 'Triggered when a feature is saved' },
  { id: 'onSchemaChange', label: 'On Schema Change', description: 'Triggered when database schema is modified' },
  { id: 'onAPIChange', label: 'On API Change', description: 'Triggered when API spec is modified' },
  { id: 'onComponentChange', label: 'On Component Change', description: 'Triggered when UI component is modified' },
  { id: 'preCommit', label: 'Pre-Commit', description: 'Triggered before git commit operation' },
] as const;

const AVAILABLE_ACTIONS: Array<{
  id: HookActionType;
  label: string;
  description: string;
  options?: Array<{ key: string; label: string; type: 'boolean' | 'string' }>;
}> = [
  {
    id: 'validateSchema',
    label: 'Validate Schema',
    description: 'Validate DBML syntax and references',
  },
  {
    id: 'updateChecklist',
    label: 'Update Checklist',
    description: 'Sync checklist with acceptance criteria',
  },
  {
    id: 'regenerateAPIs',
    label: 'Regenerate APIs',
    description: 'Update API specs from schema changes',
    options: [
      { key: 'updateFeatureRefs', label: 'Update Feature References', type: 'boolean' },
    ],
  },
  {
    id: 'runAnalyzer',
    label: 'Run Analyzer',
    description: 'Run full consistency analyzer',
    options: [
      { key: 'failOnError', label: 'Fail on Error', type: 'boolean' },
      { key: 'failOnWarning', label: 'Fail on Warning', type: 'boolean' },
    ],
  },
  {
    id: 'updateProgress',
    label: 'Update Progress',
    description: 'Recalculate task and checklist progress',
  },
  {
    id: 'notifyUser',
    label: 'Notify User',
    description: 'Show notification to user',
    options: [
      { key: 'message', label: 'Message', type: 'string' },
    ],
  },
];

export function HookConfiguration({ hooks, onChange }: HookConfigurationProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  const handleAddAction = (event: string, actionType: HookActionType) => {
    const newHooks = { ...hooks };
    const eventHooks = newHooks[event] || [];

    // Check if action already exists
    if (eventHooks.some(h => h.action === actionType)) {
      return;
    }

    newHooks[event] = [
      ...eventHooks,
      { action: actionType, options: {} as Record<string, any> },
    ];

    onChange(newHooks);
  };

  const handleRemoveAction = (event: string, index: number) => {
    const newHooks = { ...hooks };
    const eventHooks = [...(newHooks[event] || [])];
    eventHooks.splice(index, 1);

    if (eventHooks.length === 0) {
      delete newHooks[event];
    } else {
      newHooks[event] = eventHooks;
    }

    onChange(newHooks);
  };

  const handleUpdateActionOptions = (
    event: string,
    index: number,
    key: string,
    value: any
  ) => {
    const newHooks = { ...hooks };
    const eventHooks = [...(newHooks[event] || [])];
    const currentAction = eventHooks[index];

    // Ensure we have a valid action object
    if (!currentAction) return;

    const updatedOptions = { ...(currentAction.options || {}), [key]: value };

    eventHooks[index] = {
      action: currentAction.action,
      options: updatedOptions,
    };

    newHooks[event] = eventHooks;
    onChange(newHooks);
  };

  const toggleActionExpanded = (actionId: string) => {
    const newExpanded = new Set(expandedActions);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedActions(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-text-primary mb-2">Agent Hooks</h4>
        <p className="text-sm text-text-secondary mb-4">
          Configure automated actions that trigger on specific events
        </p>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {AVAILABLE_EVENTS.map((event) => {
          const eventHooks = hooks[event.id] || [];
          const hasHooks = eventHooks.length > 0;
          const isExpanded = selectedEvent === event.id;

          return (
            <div
              key={event.id}
              className="border border-border-default rounded-lg overflow-hidden bg-bg-secondary"
            >
              {/* Event header */}
              <button
                onClick={() => setSelectedEvent(isExpanded ? null : event.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  {hasHooks && (
                    <CheckCircleIcon className="h-5 w-5 text-accent-success flex-shrink-0" />
                  )}
                  <div>
                    <h5 className="font-medium text-text-primary">{event.label}</h5>
                    <p className="text-sm text-text-secondary">{event.description}</p>
                  </div>
                </div>
                <div className="text-sm text-text-secondary">
                  {eventHooks.length} action{eventHooks.length !== 1 ? 's' : ''}
                </div>
              </button>

              {/* Event content */}
              {isExpanded && (
                <div className="px-4 py-3 border-t border-border-default">
                  {/* Configured actions */}
                  {eventHooks.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {eventHooks.map((hookAction, index) => {
                        const actionDef = AVAILABLE_ACTIONS.find(a => a.id === hookAction.action);
                        const actionId = `${event.id}-${index}`;
                        const isActionExpanded = expandedActions.has(actionId);

                        return (
                          <div
                            key={index}
                            className="p-3 bg-bg-tertiary rounded-lg border border-border-default"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h6 className="font-medium text-text-primary">
                                    {actionDef?.label || hookAction.action}
                                  </h6>
                                  {actionDef?.options && actionDef.options.length > 0 && (
                                    <button
                                      onClick={() => toggleActionExpanded(actionId)}
                                      className="text-xs text-accent-primary hover:underline"
                                    >
                                      {isActionExpanded ? 'Hide' : 'Show'} options
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-text-secondary">
                                  {actionDef?.description || 'Custom action'}
                                </p>

                                {/* Action options */}
                                {isActionExpanded && actionDef?.options && (
                                  <div className="mt-3 space-y-2">
                                    {actionDef.options.map((option) => (
                                      <div key={option.key} className="flex items-center gap-2">
                                        {option.type === 'boolean' ? (
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={hookAction.options?.[option.key] === true}
                                              onChange={(e) =>
                                                handleUpdateActionOptions(
                                                  event.id,
                                                  index,
                                                  option.key,
                                                  e.target.checked
                                                )
                                              }
                                              className="w-4 h-4 rounded border-border-default bg-bg-secondary accent-accent-primary cursor-pointer"
                                            />
                                            <span className="text-sm text-text-secondary">
                                              {option.label}
                                            </span>
                                          </label>
                                        ) : (
                                          <div className="flex-1">
                                            <label className="text-sm text-text-secondary block mb-1">
                                              {option.label}
                                            </label>
                                            <input
                                              type="text"
                                              value={hookAction.options?.[option.key] || ''}
                                              onChange={(e) =>
                                                handleUpdateActionOptions(
                                                  event.id,
                                                  index,
                                                  option.key,
                                                  e.target.value
                                                )
                                              }
                                              className="w-full px-2 py-1 text-sm bg-bg-secondary text-text-primary border border-border-default rounded focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => handleRemoveAction(event.id, index)}
                                className="ml-2 p-1 text-accent-error hover:bg-accent-error/10 rounded transition-colors"
                                aria-label="Remove action"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add action menu */}
                  <div className="pt-2 border-t border-border-default">
                    <p className="text-sm font-medium text-text-secondary mb-2">
                      Add Action:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ACTIONS.map((action) => (
                        <Button
                          key={action.id}
                          onClick={() => handleAddAction(event.id, action.id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                        >
                          <PlusIcon className="h-3 w-3 mr-1" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
