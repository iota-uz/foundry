/**
 * Workflow Toolbar
 *
 * Production-grade toolbar with Linear/Vercel-inspired styling.
 * Features:
 * - Compact h-12 height
 * - Inline editable workflow name
 * - Yellow dot for unsaved changes
 * - Button groups with dividers
 * - Tooltips with keyboard shortcuts
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
} from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore, useWorkflowExecutionStore } from '@/store';
import { WorkflowStatus } from '@/lib/graph/enums';
import { validateWorkflow } from '@/lib/workflow-builder/validation';
import { Modal, ModalFooter } from '@/components/shared/modal';
import { Button } from '@/components/shared/button';

// ============================================================================
// Component
// ============================================================================

export function WorkflowToolbar() {
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

  const isExecuting =
    executionStatus === WorkflowStatus.Running ||
    executionStatus === WorkflowStatus.Paused;

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

    if (metadata.id) {
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
      className={`
        h-12 bg-bg-secondary border-b border-border-default
        flex items-center justify-between px-4
      `}
    >
      {/* Left: Workflow name with unsaved indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={metadata.name}
            onChange={(e) => updateMetadata({ name: e.target.value })}
            className={`
              bg-transparent text-sm font-semibold text-text-primary
              border-none focus:outline-none
              hover:bg-bg-tertiary focus:bg-bg-tertiary
              rounded px-2 py-1 -ml-2
              transition-colors duration-150
              max-w-[200px] truncate
            `}
            placeholder="Workflow name"
          />
          {/* Unsaved indicator dot */}
          {isDirty && (
            <div className="w-2 h-2 rounded-full bg-accent-warning ml-1 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Center: Execution controls */}
      <div className="flex items-center">
        {/* Button group */}
        <div className="flex items-center bg-bg-tertiary rounded-lg p-0.5">
          {!isExecuting ? (
            <button
              onClick={handleRun}
              disabled={nodes.length === 0}
              className={`
                flex items-center gap-1.5 px-3 h-8 rounded-md
                bg-accent-success hover:bg-accent-success/90
                text-white text-sm font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
              `}
              title="Run workflow (⌘R)"
            >
              <PlayIcon className="w-4 h-4" />
              <span>Run</span>
            </button>
          ) : (
            <>
              <button
                onClick={handlePauseResume}
                className={`
                  flex items-center gap-1.5 px-3 h-8 rounded-md
                  ${executionStatus === WorkflowStatus.Paused
                    ? 'bg-accent-success hover:bg-accent-success/90'
                    : 'bg-accent-warning hover:bg-accent-warning/90'
                  }
                  text-white text-sm font-medium
                  transition-all duration-150
                `}
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

              {/* Divider */}
              <div className="w-px h-5 bg-border-subtle mx-1" />

              <button
                onClick={cancelExecution}
                className={`
                  flex items-center gap-1.5 px-3 h-8 rounded-md
                  bg-accent-error hover:bg-accent-error/90
                  text-white text-sm font-medium
                  transition-all duration-150
                `}
              >
                <StopIcon className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-border-subtle mx-1" />

          {/* Validate button */}
          <button
            onClick={handleValidate}
            className={`
              flex items-center gap-1.5 px-3 h-8 rounded-md
              text-text-secondary hover:text-text-primary
              hover:bg-bg-hover
              text-sm font-medium
              transition-all duration-150
            `}
            title="Validate workflow"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Validate</span>
          </button>
        </div>
      </div>

      {/* Right: Save and error */}
      <div className="flex items-center gap-3">
        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 text-accent-error text-sm">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="max-w-[150px] truncate">{error}</span>
            <button
              onClick={clearError}
              className="underline hover:no-underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Save button */}
        <Button
          variant="primary"
          size="sm"
          onClick={saveWorkflow}
          disabled={isLoading || !isDirty}
          loading={isLoading}
          icon={<CloudArrowUpIcon className="w-4 h-4" />}
        >
          Save
        </Button>
      </div>

      {/* Validation Modal */}
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
          <div className="flex items-center gap-2 text-accent-success">
            <CheckCircleIcon className="w-5 h-5" />
            <span>Workflow is valid and ready to run.</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {validationErrors.map((err, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-accent-error text-sm"
              >
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{err}</span>
              </li>
            ))}
          </ul>
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
