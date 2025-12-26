/**
 * Docker Image Configuration Panel
 *
 * Manages Docker image for containerized workflow execution.
 * Allows users to specify a custom image or use the default.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore } from '@/store';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_IMAGE = 'foundry/workflow-runner:latest';
const PLACEHOLDER_IMAGE = 'ghcr.io/myorg/my-tools:v1.0';

// ============================================================================
// Types
// ============================================================================

interface DockerImageConfigProps {
  /** Workflow ID (for future use with direct API calls) */
  workflowId: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function DockerImageConfig({ workflowId: _workflowId }: DockerImageConfigProps) {
  const { metadata, updateMetadata, saveWorkflow } = useWorkflowBuilderStore();
  const [localValue, setLocalValue] = useState(metadata.dockerImage ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with store when metadata changes
  useEffect(() => {
    setLocalValue(metadata.dockerImage ?? '');
  }, [metadata.dockerImage]);

  // Validate Docker image format
  const validateDockerImage = (image: string): string | null => {
    if (!image.trim()) {
      return null; // Empty is valid (uses default)
    }

    // Basic Docker image format validation
    const dockerImageRegex = /^[a-z0-9]([a-z0-9._/-]*[a-z0-9])?(:[\w][\w.-]*)?(@sha256:[a-f0-9]{64})?$/i;
    if (!dockerImageRegex.test(image)) {
      return 'Invalid Docker image format. Example: ghcr.io/org/image:tag';
    }

    return null;
  };

  // Handle save
  const handleSave = async () => {
    const trimmedValue = localValue.trim();
    const validationError = validateDockerImage(trimmedValue);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      // Update metadata with the new Docker image
      // Use conditional spread for exactOptionalPropertyTypes compliance
      updateMetadata(trimmedValue ? { dockerImage: trimmedValue } : {});

      // Save the workflow
      await saveWorkflow();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle blur - auto-save if changed
  const handleBlur = () => {
    const trimmedValue = localValue.trim();
    if (trimmedValue !== (metadata.dockerImage ?? '')) {
      void handleSave();
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    }
  };

  const hasCustomImage = localValue.trim() !== '';

  return (
    <div className="p-4 border-b border-border-subtle">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
          <CubeIcon className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">Docker Image</h3>
          <p className="text-[11px] text-text-muted">
            {hasCustomImage ? 'Custom container' : 'Default container'}
          </p>
        </div>
        {saveSuccess && (
          <CheckCircleIcon className="w-4 h-4 text-accent-success ml-auto" />
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-3 p-2 rounded-lg bg-accent-error/10 border border-accent-error/20 flex items-start gap-2">
          <ExclamationCircleIcon className="w-4 h-4 text-accent-error flex-shrink-0 mt-0.5" />
          <p className="text-xs text-accent-error">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER_IMAGE}
          className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-lg text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
          disabled={isSaving}
        />

        <p className="text-[10px] text-text-muted">
          Leave empty to use <code className="px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary">{DEFAULT_IMAGE}</code>
        </p>
      </div>

      {/* Info Note */}
      <div className="mt-3 flex items-start gap-2 text-[10px] text-text-muted">
        <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p>
          Custom images must extend <code className="px-0.5 bg-bg-tertiary rounded">{DEFAULT_IMAGE}</code> to run workflows.
        </p>
      </div>
    </div>
  );
}
