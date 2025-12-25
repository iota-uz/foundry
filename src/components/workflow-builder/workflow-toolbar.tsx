/**
 * Workflow Toolbar
 *
 * Top toolbar with workflow actions:
 * - Save/Load
 * - Run/Stop execution
 * - Validate
 * - Workflow name editing
 */

'use client';

import React, { useState } from 'react';
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore, useWorkflowExecutionStore } from '@/store';
import { WorkflowStatus } from '@/lib/graph/enums';
import { validateWorkflow } from '@/lib/workflow-builder/validation';

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
    // Validate first
    const errors = validateWorkflow(nodes, edges);
    if (errors.length > 0) {
      setValidationErrors(errors.map((e) => `${e.nodeId}: ${e.message}`));
      setShowValidation(true);
      return;
    }

    // Save if dirty
    if (isDirty) {
      await saveWorkflow();
    }

    // Start execution
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
    <div className="h-14 bg-bg-secondary border-b border-border-default flex items-center justify-between px-4">
      {/* Left: Workflow name */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={metadata.name}
          onChange={(e) => updateMetadata({ name: e.target.value })}
          className="
            bg-transparent border-none text-lg font-semibold text-text-primary
            focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1
            hover:bg-bg-tertiary transition-colors
          "
          placeholder="Workflow name"
        />
        {isDirty && (
          <span className="text-xs text-text-tertiary">(unsaved)</span>
        )}
      </div>

      {/* Center: Execution controls */}
      <div className="flex items-center gap-2">
        {!isExecuting ? (
          <button
            onClick={handleRun}
            disabled={nodes.length === 0}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-green-600 hover:bg-green-700 disabled:opacity-50
              text-white font-medium transition-colors
            "
          >
            <PlayIcon className="w-4 h-4" />
            Run
          </button>
        ) : (
          <>
            <button
              onClick={handlePauseResume}
              className="
                flex items-center gap-2 px-4 py-2 rounded-lg
                bg-yellow-600 hover:bg-yellow-700
                text-white font-medium transition-colors
              "
            >
              {executionStatus === WorkflowStatus.Paused ? (
                <>
                  <PlayIcon className="w-4 h-4" />
                  Resume
                </>
              ) : (
                <>
                  <PauseIcon className="w-4 h-4" />
                  Pause
                </>
              )}
            </button>
            <button
              onClick={cancelExecution}
              className="
                flex items-center gap-2 px-4 py-2 rounded-lg
                bg-red-600 hover:bg-red-700
                text-white font-medium transition-colors
              "
            >
              <StopIcon className="w-4 h-4" />
              Stop
            </button>
          </>
        )}

        <button
          onClick={handleValidate}
          className="
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-bg-tertiary hover:bg-[#333333] text-text-secondary
            transition-colors
          "
        >
          <CheckCircleIcon className="w-4 h-4" />
          Validate
        </button>
      </div>

      {/* Right: Save */}
      <div className="flex items-center gap-2">
        {error && (
          <div className="flex items-center gap-1 text-red-400 text-sm">
            <ExclamationTriangleIcon className="w-4 h-4" />
            {error}
            <button onClick={clearError} className="ml-1 underline">
              Dismiss
            </button>
          </div>
        )}

        <button
          onClick={saveWorkflow}
          disabled={isLoading || !isDirty}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-blue-600 hover:bg-blue-700 disabled:opacity-50
            text-white font-medium transition-colors
          "
        >
          {isLoading ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <CloudArrowUpIcon className="w-4 h-4" />
          )}
          Save
        </button>
      </div>

      {/* Validation popup */}
      {showValidation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {validationErrors.length === 0 ? 'Validation Passed' : 'Validation Errors'}
            </h3>

            {validationErrors.length === 0 ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircleIcon className="w-5 h-5" />
                Workflow is valid and ready to run.
              </div>
            ) : (
              <ul className="space-y-2">
                {validationErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2 text-red-400 text-sm">
                    <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {err}
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setShowValidation(false)}
              className="
                mt-6 w-full py-2 rounded-lg
                bg-bg-tertiary hover:bg-[#333333]
                text-text-primary transition-colors
              "
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
