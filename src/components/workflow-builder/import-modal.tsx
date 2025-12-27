/**
 * Import DSL Modal Component
 *
 * Modal for importing TypeScript DSL workflow definitions.
 * Features:
 * - Paste DSL code or drag-and-drop file
 * - Live validation with error display
 * - Syntax-highlighted preview
 * - Import confirmation with warnings
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Modal, ModalBody, ModalFooter } from '@/components/shared/modal';
import { Button } from '@/components/shared/button';
import { parseDSL, dslToReactFlow, validateDSL } from '@/lib/workflow-dsl';
import type { ValidationError } from '@/lib/workflow-dsl';
import { useWorkflowBuilderStore } from '@/store';

// ============================================================================
// Types
// ============================================================================

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful import */
  onImportSuccess?: () => void;
}

interface ParseResult {
  valid: boolean;
  errors: ValidationError[];
  nodeCount: number;
  workflowName: string;
}

// ============================================================================
// Component
// ============================================================================

export function ImportModal({ isOpen, onClose, onImportSuccess }: ImportModalProps) {
  const [code, setCode] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setNodes, setEdges, updateMetadata, metadata } = useWorkflowBuilderStore();

  // Validate code on change
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    setParseError(null);
    setParseResult(null);

    if (!newCode.trim()) return;

    try {
      // Parse the DSL
      const { workflow, warnings } = parseDSL(newCode);

      // Validate the workflow
      const validation = validateDSL(workflow);

      // Combine parse warnings with validation errors
      const allErrors: ValidationError[] = [
        ...warnings.map((w) => ({
          code: 'PARSE_WARNING',
          message: w,
          severity: 'warning' as const,
        })),
        ...validation.errors,
      ];

      setParseResult({
        valid: validation.valid && allErrors.filter((e) => e.severity === 'error').length === 0,
        errors: allErrors,
        nodeCount: Object.keys(workflow.nodes).length,
        workflowName: workflow.name ?? workflow.id,
      });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse DSL');
      setParseResult(null);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleCodeChange(content);
      };
      reader.readAsText(file);
    },
    [handleCodeChange]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.ts') || file.name.endsWith('.tsx'))) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  // Import the workflow
  const handleImport = useCallback(async () => {
    if (!parseResult?.valid || !code.trim()) return;

    setIsImporting(true);

    try {
      const { workflow } = parseDSL(code);
      const { nodes, edges, metadata: newMetadata } = dslToReactFlow(
        workflow,
        metadata.projectId // Preserve current project ID
      );

      // Update the store
      setNodes(nodes);
      setEdges(edges);
      updateMetadata({
        ...newMetadata,
        projectId: metadata.projectId, // Ensure project ID is preserved
      });

      // Close modal and notify success
      onClose();
      onImportSuccess?.();

      // Reset state
      setCode('');
      setParseResult(null);
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to import workflow');
    } finally {
      setIsImporting(false);
    }
  }, [code, parseResult, metadata.projectId, setNodes, setEdges, updateMetadata, onClose, onImportSuccess]);

  // Reset on close
  const handleClose = useCallback(() => {
    setCode('');
    setParseResult(null);
    setParseError(null);
    onClose();
  }, [onClose]);

  const errorCount = parseResult?.errors.filter((e) => e.severity === 'error').length ?? 0;
  const warningCount = parseResult?.errors.filter((e) => e.severity === 'warning').length ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Workflow DSL"
      description="Paste TypeScript workflow code or drop a .ts file"
      size="lg"
    >
      <ModalBody maxHeight="max-h-[70vh]">
        {/* Drop zone / Code input */}
        <div
          className={`
            relative rounded-lg border-2 border-dashed transition-colors duration-200
            ${isDragOver ? 'border-accent-primary bg-accent-primary/5' : 'border-border-default'}
            ${parseError ? 'border-accent-error/50' : ''}
            ${parseResult?.valid ? 'border-emerald-500/50' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={`// Paste your workflow DSL here...

import { defineWorkflow, Tools } from '@foundry/dsl';

export default defineWorkflow({
  id: 'my-workflow',
  context: {},
  nodes: {
    // ...
  },
  start: 'START',
});`}
            className={`
              w-full h-64 p-4
              bg-transparent
              font-mono text-sm
              text-text-primary placeholder:text-text-muted
              resize-none
              focus:outline-none
            `}
            spellCheck={false}
          />

          {/* Empty state overlay */}
          {!code && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <DocumentArrowUpIcon className="w-10 h-10 mx-auto mb-3 text-text-muted" />
                <p className="text-sm text-text-secondary">
                  Drop a <span className="font-mono text-accent-primary">.workflow.ts</span> file here
                </p>
                <p className="text-xs text-text-muted mt-1">or paste code above</p>
              </div>
            </div>
          )}
        </div>

        {/* File upload button */}
        <div className="mt-3 flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            icon={<DocumentTextIcon className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Browse files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ts,.tsx"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {code && (
            <button
              onClick={() => handleCodeChange('')}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="mt-4 p-3 rounded-lg bg-accent-error/10 border border-accent-error/20">
            <div className="flex items-start gap-2">
              <XCircleIcon className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-accent-error">Parse Error</p>
                <p className="text-xs text-accent-error/80 mt-1 font-mono">{parseError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Validation result */}
        {parseResult && (
          <div className="mt-4 space-y-3">
            {/* Summary */}
            <div
              className={`
                p-3 rounded-lg border
                ${parseResult.valid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}
              `}
            >
              <div className="flex items-center gap-2">
                {parseResult.valid ? (
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${parseResult.valid ? 'text-emerald-400' : 'text-amber-400'}`}
                  >
                    {parseResult.valid ? 'Valid workflow' : 'Validation issues found'}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    <span className="font-medium">{parseResult.workflowName}</span>
                    <span className="mx-2">·</span>
                    {parseResult.nodeCount} node{parseResult.nodeCount !== 1 ? 's' : ''}
                    {warningCount > 0 && (
                      <>
                        <span className="mx-2">·</span>
                        <span className="text-amber-400">{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
                      </>
                    )}
                    {errorCount > 0 && (
                      <>
                        <span className="mx-2">·</span>
                        <span className="text-accent-error">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Error/Warning list */}
            {parseResult.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1.5">
                {parseResult.errors.map((error, i) => (
                  <div
                    key={i}
                    className={`
                      flex items-start gap-2 text-xs p-2 rounded
                      ${error.severity === 'error' ? 'bg-accent-error/5 text-accent-error' : 'bg-amber-500/5 text-amber-400'}
                    `}
                  >
                    <span
                      className={`
                        flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase
                        ${error.severity === 'error' ? 'bg-accent-error/20' : 'bg-amber-500/20'}
                      `}
                    >
                      {error.severity}
                    </span>
                    <span className="flex-1">{error.message}</span>
                    {error.path && (
                      <span className="font-mono text-text-muted">{error.path}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleImport}
          disabled={!parseResult?.valid || isImporting}
          loading={isImporting}
        >
          Import Workflow
        </Button>
      </ModalFooter>
    </Modal>
  );
}
