/**
 * Workflow Toolbar
 *
 * Production-grade toolbar with refined industrial aesthetic.
 * Features:
 * - Subtle gradient background with depth
 * - Glowing Run button with pulse animation
 * - Animated unsaved indicator
 * - Refined button groups with glass styling
 * - Keyboard shortcut badges
 * - Elegant error display
 */

'use client';

import React, { useState } from 'react';
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  PlayCircleIcon,
  ClockIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useWorkflowBuilderStore, useWorkflowExecutionStore } from '@/store';
import { WorkflowStatus } from '@/lib/graph/enums';
import { validateWorkflow } from '@/lib/workflow-builder/validation';
import { Modal, ModalFooter } from '@/components/shared/modal';
import { Button } from '@/components/shared/button';

// ============================================================================
// Types
// ============================================================================

interface WorkflowToolbarProps {
  onExecutionClick?: () => void;
  onHistoryClick?: () => void;
  isExecuting?: boolean;
  executionActive?: boolean;
  historyActive?: boolean;
}

// ============================================================================
// Keyboard Shortcut Badge
// ============================================================================

function KbdBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="
        inline-flex items-center justify-center
        min-w-[18px] h-[18px] px-1
        text-[10px] font-medium text-text-tertiary
        bg-bg-primary/80 border border-border-subtle
        rounded shadow-sm
      "
    >
      {children}
    </kbd>
  );
}

// ============================================================================
// Tooltip Component
// ============================================================================

function Tooltip({
  children,
  content,
  shortcut,
}: {
  children: React.ReactNode;
  content: string;
  shortcut?: string;
}) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div
        className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-2.5 py-1.5 rounded-lg
          bg-bg-elevated border border-border-default
          shadow-xl shadow-black/30
          opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible
          transition-all duration-150 delay-300
          whitespace-nowrap z-50
          pointer-events-none
        "
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">{content}</span>
          {shortcut != null && shortcut !== '' && (
            <KbdBadge>{shortcut}</KbdBadge>
          )}
        </div>
        {/* Arrow */}
        <div
          className="
            absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-border-default
          "
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkflowToolbar({
  onExecutionClick,
  onHistoryClick,
  isExecuting: isExecutingProp,
  executionActive = false,
  historyActive = false,
}: WorkflowToolbarProps) {
  const {
    nodes,
    edges,
    metadata,
    isDirty,
    isLoading,
    error,
    updateMetadata,
    saveWorkflow,
    clearError,
  } = useWorkflowBuilderStore();

  const {
    status: executionStatus,
    startExecution,
    pauseExecution,
    resumeExecution,
    cancelExecution,
  } = useWorkflowExecutionStore();

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const isExecuting =
    isExecutingProp ??
    (executionStatus === WorkflowStatus.Running ||
      executionStatus === WorkflowStatus.Paused);

  const handleValidate = () => {
    const errors = validateWorkflow(nodes, edges);
    setValidationErrors(errors.map((e) => `${e.nodeId}: ${e.message}`));
    setShowValidation(true);
  };

  const handleRun = async () => {
    const errors = validateWorkflow(nodes, edges);
    if (errors.length > 0) {
      setValidationErrors(errors.map((e) => `${e.nodeId}: ${e.message}`));
      setShowValidation(true);
      return;
    }

    if (isDirty) {
      await saveWorkflow();
    }

    if (
      metadata.id !== undefined &&
      metadata.id !== null &&
      metadata.id !== ''
    ) {
      await startExecution(metadata.id);
    }
  };

  const handlePauseResume = async () => {
    if (executionStatus === WorkflowStatus.Paused) {
      await resumeExecution();
    } else {
      await pauseExecution();
    }
  };

  return (
    <div
      className="
        relative h-12 flex items-center justify-between px-4
        border-b border-border-default
      "
      style={{
        background: 'linear-gradient(180deg, #1c1c20 0%, #18181b 100%)',
      }}
    >
      {/* Subtle top highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #ffffff08 50%, transparent 100%)',
        }}
      />

      {/* ================================================================
          LEFT: Workflow Name
          ================================================================ */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="
            group relative flex items-center gap-2
            px-2.5 py-1.5 -ml-2.5 rounded-lg
            hover:bg-bg-tertiary/50
            transition-colors duration-150
            cursor-text
          "
          onClick={() => setIsEditingName(true)}
        >
          <input
            type="text"
            value={metadata.name}
            onChange={(e) => updateMetadata({ name: e.target.value })}
            onFocus={() => setIsEditingName(true)}
            onBlur={() => setIsEditingName(false)}
            className="
              bg-transparent text-sm font-semibold text-text-primary
              border-none focus:outline-none
              max-w-[180px] truncate
              placeholder:text-text-muted
            "
            placeholder="Untitled workflow"
          />

          {/* Edit icon on hover */}
          {!isEditingName && (
            <PencilIcon
              className="
                w-3 h-3 text-text-muted
                opacity-0 group-hover:opacity-100
                transition-opacity duration-150
              "
            />
          )}

          {/* Unsaved indicator with pulse animation */}
          {isDirty && (
            <div className="relative flex-shrink-0">
              <div
                className="
                  w-2 h-2 rounded-full
                  bg-accent-warning
                  animate-pulse
                "
              />
              <div
                className="
                  absolute inset-0 w-2 h-2 rounded-full
                  bg-accent-warning/50
                  animate-ping
                "
                style={{ animationDuration: '2s' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          CENTER: Execution Controls
          ================================================================ */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div
          className="
            flex items-center gap-0.5
            p-1 rounded-xl
            bg-bg-primary/60 backdrop-blur-sm
            border border-border-subtle
            shadow-lg shadow-black/20
          "
        >
          {!isExecuting ? (
            /* Run Button - Hero element with glow */
            <Tooltip content="Run workflow" shortcut="⌘R">
              <button
                onClick={handleRun}
                disabled={nodes.length === 0}
                className="
                  relative group
                  flex items-center gap-1.5 px-4 h-8 rounded-lg
                  text-white text-sm font-semibold
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200
                  overflow-hidden
                  cursor-pointer
                "
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: nodes.length > 0
                    ? '0 0 20px #10b98140, 0 4px 12px #00000040'
                    : undefined,
                }}
              >
                {/* Shine effect on hover */}
                <div
                  className="
                    absolute inset-0 opacity-0 group-hover:opacity-100
                    transition-opacity duration-300
                  "
                  style={{
                    background:
                      'linear-gradient(135deg, transparent 0%, #ffffff15 50%, transparent 100%)',
                  }}
                />
                <PlayIcon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Run</span>
              </button>
            </Tooltip>
          ) : (
            /* Executing state buttons */
            <>
              <Tooltip
                content={
                  executionStatus === WorkflowStatus.Paused
                    ? 'Resume'
                    : 'Pause'
                }
                shortcut="⌘P"
              >
                <button
                  onClick={handlePauseResume}
                  className="
                    relative flex items-center gap-1.5 px-3 h-8 rounded-lg
                    text-white text-sm font-medium
                    transition-all duration-200
                    cursor-pointer
                  "
                  style={{
                    background:
                      executionStatus === WorkflowStatus.Paused
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    boxShadow:
                      executionStatus === WorkflowStatus.Paused
                        ? '0 0 16px #10b98140'
                        : '0 0 16px #f59e0b40',
                  }}
                >
                  {executionStatus === WorkflowStatus.Paused ? (
                    <>
                      <PlayIcon className="w-4 h-4" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <PauseIcon className="w-4 h-4" />
                      <span>Pause</span>
                    </>
                  )}
                </button>
              </Tooltip>

              {/* Divider */}
              <div className="w-px h-5 bg-border-subtle mx-0.5" />

              <Tooltip content="Stop execution" shortcut="⌘.">
                <button
                  onClick={cancelExecution}
                  className="
                    flex items-center gap-1.5 px-3 h-8 rounded-lg
                    text-white text-sm font-medium
                    transition-all duration-200
                    cursor-pointer
                  "
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    boxShadow: '0 0 16px #ef444440',
                  }}
                >
                  <StopIcon className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              </Tooltip>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-border-subtle mx-1" />

          {/* Validate button */}
          <Tooltip content="Validate workflow" shortcut="⌘⇧V">
            <button
              onClick={handleValidate}
              className="
                flex items-center gap-1.5 px-3 h-8 rounded-lg
                text-text-secondary hover:text-text-primary
                hover:bg-bg-hover
                text-sm font-medium
                transition-all duration-150
                cursor-pointer
              "
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Validate</span>
            </button>
          </Tooltip>
        </div>

        {/* Executing indicator - subtle glow */}
        {isExecuting && (
          <div
            className="
              absolute -inset-0.5 rounded-xl
              pointer-events-none
              animate-pulse
            "
            style={{
              boxShadow: executionStatus === WorkflowStatus.Paused
                ? '0 0 20px #f59e0b30'
                : '0 0 20px #10b98130',
            }}
          />
        )}
      </div>

      {/* ================================================================
          RIGHT: Toggles, Save, Error
          ================================================================ */}
      <div className="flex items-center gap-3">
        {/* Panel Toggle Buttons */}
        {(onExecutionClick !== undefined || onHistoryClick !== undefined) && (
          <div
            className="
              flex items-center
              p-0.5 rounded-lg
              bg-bg-primary/60 backdrop-blur-sm
              border border-border-subtle
            "
          >
            {onExecutionClick !== undefined && (
              <Tooltip content="Execution panel">
                <button
                  onClick={onExecutionClick}
                  className={`
                    relative flex items-center gap-1.5 px-2.5 h-7 rounded-md
                    text-xs font-medium
                    transition-all duration-150
                    cursor-pointer
                    ${
                      executionActive
                        ? 'bg-bg-tertiary text-text-primary shadow-sm'
                        : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover/50'
                    }
                  `}
                >
                  <PlayCircleIcon
                    className={`
                      w-3.5 h-3.5
                      ${isExecuting ? 'text-accent-success' : ''}
                    `}
                  />
                  {/* Live indicator when executing */}
                  {isExecuting && (
                    <span
                      className="
                        absolute top-1 right-1 w-1.5 h-1.5
                        rounded-full bg-accent-success
                        animate-pulse
                      "
                    />
                  )}
                  <span className="hidden sm:inline">Execution</span>
                </button>
              </Tooltip>
            )}

            {onExecutionClick !== undefined &&
              onHistoryClick !== undefined && (
                <div className="w-px h-4 bg-border-subtle" />
              )}

            {onHistoryClick !== undefined && (
              <Tooltip content="Execution history">
                <button
                  onClick={onHistoryClick}
                  className={`
                    flex items-center gap-1.5 px-2.5 h-7 rounded-md
                    text-xs font-medium
                    transition-all duration-150
                    cursor-pointer
                    ${
                      historyActive
                        ? 'bg-bg-tertiary text-text-primary shadow-sm'
                        : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover/50'
                    }
                  `}
                >
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">History</span>
                </button>
              </Tooltip>
            )}
          </div>
        )}

        {/* Error Display - Toast style */}
        {error !== null && error !== undefined && error !== '' && (
          <div
            className="
              flex items-center gap-2 px-3 py-1.5
              rounded-lg
              bg-accent-error/10 border border-accent-error/30
              text-accent-error text-xs
              animate-in fade-in slide-in-from-right-2 duration-200
            "
          >
            <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="max-w-[120px] truncate">{error}</span>
            <button
              onClick={clearError}
              className="
                p-0.5 rounded hover:bg-accent-error/20
                transition-colors duration-150
                cursor-pointer
              "
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Save Button */}
        <Tooltip content={isDirty ? 'Save changes' : 'No changes'} shortcut="⌘S">
          <button
            onClick={saveWorkflow}
            disabled={isLoading || !isDirty}
            className={`
              relative flex items-center gap-1.5 px-3.5 h-8 rounded-lg
              text-sm font-medium
              transition-all duration-200
              disabled:cursor-not-allowed
              cursor-pointer
              ${
                isDirty
                  ? 'text-white'
                  : 'text-text-tertiary bg-bg-tertiary border border-border-subtle'
              }
            `}
            style={
              isDirty
                ? {
                    background:
                      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 0 16px #3b82f640, 0 2px 8px #00000040',
                  }
                : undefined
            }
          >
            {isLoading ? (
              <div
                className="
                  w-4 h-4 rounded-full
                  border-2 border-current border-t-transparent
                  animate-spin
                "
              />
            ) : (
              <CloudArrowUpIcon className="w-4 h-4" />
            )}
            <span>Save</span>

            {/* Success checkmark flash */}
            {!isDirty && !isLoading && (
              <CheckIcon
                className="
                  w-3 h-3 text-accent-success ml-0.5
                  animate-in fade-in zoom-in duration-200
                "
              />
            )}
          </button>
        </Tooltip>
      </div>

      {/* ================================================================
          Validation Modal
          ================================================================ */}
      <Modal
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        title={
          validationErrors.length === 0
            ? 'Validation Passed'
            : 'Validation Errors'
        }
        size="sm"
      >
        {validationErrors.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-accent-success/10 border border-accent-success/20">
            <div
              className="
                w-10 h-10 rounded-full
                bg-accent-success/20
                flex items-center justify-center
              "
            >
              <CheckCircleIcon className="w-5 h-5 text-accent-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                All checks passed
              </p>
              <p className="text-xs text-text-tertiary">
                Workflow is valid and ready to run
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {validationErrors.map((err, i) => (
              <div
                key={i}
                className="
                  flex items-start gap-3 p-3 rounded-lg
                  bg-accent-error/5 border border-accent-error/20
                "
              >
                <ExclamationTriangleIcon className="w-4 h-4 text-accent-error flex-shrink-0 mt-0.5" />
                <span className="text-sm text-text-secondary">{err}</span>
              </div>
            ))}
          </div>
        )}

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowValidation(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
