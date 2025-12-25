/**
 * Automation Editor Component
 *
 * Slide-over panel for creating/editing automations.
 * Features:
 * - Trigger type configuration
 * - Workflow selection
 * - Transition rules management
 * - Priority and enabled settings
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  BoltIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { TriggerConfig } from './trigger-config';
import { WorkflowSelector } from './workflow-selector';
import { TransitionList } from './transition-list';
import type {
  Automation,
  CreateAutomationData,
  UpdateAutomationData,
  CreateTransitionData,
  UpdateTransitionData,
} from '@/store/automation.store';

// ============================================================================
// Types
// ============================================================================

interface AutomationEditorProps {
  automation: Automation | null; // null = create mode
  availableStatuses: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateAutomationData | UpdateAutomationData) => Promise<void>;
  onCreateTransition: (data: CreateTransitionData) => Promise<void>;
  onUpdateTransition: (id: string, data: UpdateTransitionData) => Promise<void>;
  onDeleteTransition: (id: string) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}

// ============================================================================
// Component
// ============================================================================

export function AutomationEditor({
  automation,
  availableStatuses,
  isOpen,
  onClose,
  onSave,
  onCreateTransition,
  onUpdateTransition,
  onDeleteTransition,
  isSaving,
  error,
}: AutomationEditorProps) {
  // Form state
  const [triggerType, setTriggerType] = useState<'status_enter' | 'manual'>('status_enter');
  const [triggerStatus, setTriggerStatus] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [priority, setPriority] = useState(0);
  const [enabled, setEnabled] = useState(true);

  // Validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isEditMode = automation !== null;

  // Reset form when automation changes
  useEffect(() => {
    if (automation) {
      setTriggerType(automation.triggerType);
      setTriggerStatus(automation.triggerStatus || '');
      setButtonLabel(automation.buttonLabel || '');
      setWorkflowId(automation.workflowId);
      setPriority(automation.priority);
      setEnabled(automation.enabled);
    } else {
      setTriggerType('status_enter');
      setTriggerStatus('');
      setButtonLabel('');
      setWorkflowId('');
      setPriority(0);
      setEnabled(true);
    }
    setValidationErrors({});
  }, [automation, isOpen]);

  // Validate form
  const validate = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!workflowId) {
      errors.workflowId = 'Please select a workflow';
    }

    if (triggerType === 'status_enter' && !triggerStatus) {
      errors.triggerStatus = 'Please select a status';
    }

    if (triggerType === 'manual' && !buttonLabel.trim()) {
      errors.buttonLabel = 'Please enter a button label';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [workflowId, triggerType, triggerStatus, buttonLabel]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validate()) return;

    // Build data object conditionally to avoid undefined values
    const baseData = {
      triggerType,
      workflowId,
      priority,
      enabled,
    };

    const data: CreateAutomationData | UpdateAutomationData = triggerType === 'status_enter'
      ? { ...baseData, triggerStatus }
      : { ...baseData, buttonLabel };

    await onSave(data);
  }, [validate, triggerType, workflowId, priority, enabled, triggerStatus, buttonLabel, onSave]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 z-50
          w-full max-w-lg
          bg-bg-primary border-l border-border-default
          shadow-2xl shadow-black/50
          flex flex-col
          animate-in slide-in-from-right duration-300
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div
              className={`
                w-9 h-9 rounded-lg
                flex items-center justify-center
                bg-emerald-500/10 border border-emerald-500/30
              `}
            >
              <BoltIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-text-primary">
                {isEditMode ? 'Edit Automation' : 'New Automation'}
              </h2>
              <span className="text-xs font-mono text-text-tertiary">
                {isEditMode ? automation.id.slice(0, 8) : 'configure trigger and workflow'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`
              p-2 rounded-lg
              text-text-tertiary hover:text-text-primary
              hover:bg-bg-hover
              transition-colors
            `}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error display */}
            {error && (
              <div
                className={`
                  flex items-start gap-3 p-4
                  bg-red-500/10 border border-red-500/30 rounded-lg
                `}
              >
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-red-400">Error</div>
                  <div className="text-xs text-red-400/80 mt-1">{error}</div>
                </div>
              </div>
            )}

            {/* Trigger Configuration */}
            <section>
              <h3 className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider mb-4">
                Trigger
              </h3>
              <TriggerConfig
                triggerType={triggerType}
                triggerStatus={triggerStatus}
                buttonLabel={buttonLabel}
                availableStatuses={availableStatuses}
                onTriggerTypeChange={setTriggerType}
                onTriggerStatusChange={setTriggerStatus}
                onButtonLabelChange={setButtonLabel}
                errors={
                  validationErrors.triggerStatus || validationErrors.buttonLabel
                    ? {
                        ...(validationErrors.triggerStatus && { triggerStatus: validationErrors.triggerStatus }),
                        ...(validationErrors.buttonLabel && { buttonLabel: validationErrors.buttonLabel }),
                      }
                    : undefined
                }
              />
            </section>

            {/* Workflow Selection */}
            <section>
              <h3 className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider mb-4">
                Workflow
              </h3>
              <WorkflowSelector
                value={workflowId}
                onChange={setWorkflowId}
                error={validationErrors.workflowId || undefined}
              />
            </section>

            {/* Priority & Enabled */}
            <section>
              <h3 className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider mb-4">
                Settings
              </h3>
              <div className="space-y-4">
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Priority
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                      min={0}
                      max={100}
                      className={`
                        w-24 h-10 px-3
                        bg-bg-secondary text-text-primary text-sm font-mono
                        border border-border-default rounded-lg
                        focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500
                      `}
                    />
                    <span className="text-xs text-text-tertiary">
                      Higher priority runs first (0-100)
                    </span>
                  </div>
                </div>

                {/* Enabled toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-border-subtle">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Enabled</div>
                    <div className="text-xs text-text-tertiary">
                      Automation will trigger when conditions are met
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnabled(!enabled)}
                    className={`
                      relative w-11 h-6 rounded-full
                      transition-colors duration-200
                      ${enabled ? 'bg-emerald-500' : 'bg-bg-tertiary'}
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-5 h-5 rounded-full bg-white
                        transition-transform duration-200
                        ${enabled ? 'left-5.5' : 'left-0.5'}
                      `}
                      style={{ left: enabled ? '22px' : '2px' }}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* Transitions (only in edit mode) */}
            {isEditMode && automation && (
              <section>
                <h3 className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider mb-4">
                  Status Transitions
                </h3>
                <TransitionList
                  transitions={automation.transitions}
                  availableStatuses={availableStatuses}
                  onAdd={onCreateTransition}
                  onUpdate={onUpdateTransition}
                  onDelete={onDeleteTransition}
                  isSaving={isSaving}
                />
              </section>
            )}

            {/* Create mode hint for transitions */}
            {!isEditMode && (
              <div className="p-4 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <div className="text-sm text-text-tertiary">
                  <span className="text-yellow-400 font-mono">Note:</span>{' '}
                  Save the automation first, then add status transitions.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-secondary/50">
          <div className="text-xs font-mono text-text-muted">
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-tertiary">⌘S</kbd>
            {' '}save
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`
                px-4 py-2 rounded-lg
                text-sm font-medium text-text-secondary
                hover:bg-bg-hover
                transition-colors
                disabled:opacity-50
              `}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`
                inline-flex items-center gap-2
                px-4 py-2 rounded-lg
                text-sm font-medium
                bg-emerald-500/10 border border-emerald-500/40
                text-emerald-400
                hover:bg-emerald-500/20 hover:border-emerald-500/60
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isSaving ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isEditMode ? 'Save Changes' : 'Create Automation'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
