/**
 * Workflow Editor Page
 *
 * Production-grade visual workflow builder with Railway-inspired styling.
 * Features:
 * - Polished loading state with skeleton
 * - Clean error state
 * - Sliding config drawer (opens when node selected)
 * - Execution/History tabs in toolbar dropdown
 */

'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useRouter } from 'next/navigation';
import {
  PlayCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore, useWorkflowExecutionStore } from '@/store';
import {
  WorkflowCanvas,
  WorkflowToolbar,
  NodeConfigPanel,
  ExecutionPanel,
  ExecutionHistory,
  EnvEditor,
  DockerImageConfig,
} from '@/components/workflow-builder';
import { WorkflowStatus } from '@/lib/graph/enums';
import { Button, Skeleton } from '@/components/shared';

interface PageProps {
  params: Promise<{ id: string; workflowId: string }>;
}

type RightDrawerView = 'config' | 'execution' | 'history' | 'settings' | null;

// ============================================================================
// Loading Skeleton
// ============================================================================

function EditorSkeleton() {
  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Toolbar skeleton */}
      <div className="h-12 bg-bg-secondary border-b border-border-default flex items-center px-4">
        <Skeleton className="w-32 h-5" />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-20 h-8 rounded-lg" />
          <Skeleton className="w-16 h-8 rounded-lg" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar skeleton */}
        <div className="w-56 border-r border-border-default bg-bg-secondary p-4">
          <Skeleton className="w-24 h-4 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-full h-14 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Canvas skeleton */}
        <div className="flex-1 bg-bg-primary flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
            <p className="text-sm text-text-secondary">Loading workflow...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function WorkflowEditorPage({ params }: PageProps) {
  const { id: projectId, workflowId } = use(params);
  const router = useRouter();
  const { loadWorkflow, isLoading, error, selectedNodeId, selectNode, updateMetadata } =
    useWorkflowBuilderStore();
  const { status: executionStatus, reset: resetExecution } =
    useWorkflowExecutionStore();

  const [rightDrawerView, setRightDrawerView] = useState<RightDrawerView>(null);

  // Auto-open config drawer when a node is selected
  useEffect(() => {
    if (selectedNodeId !== null && selectedNodeId !== '') {
      setRightDrawerView('config');
    }
  }, [selectedNodeId]);

  // Auto-switch to execution panel when running
  useEffect(() => {
    if (
      executionStatus === WorkflowStatus.Running ||
      executionStatus === WorkflowStatus.Paused
    ) {
      setRightDrawerView('execution');
    }
  }, [executionStatus]);

  useEffect(() => {
    if (workflowId !== null && workflowId !== '') {
      void loadWorkflow(workflowId, projectId);
      // Reset execution state when loading a new workflow
      resetExecution();
    }
  }, [workflowId, projectId, loadWorkflow, resetExecution]);

  // Ensure projectId is set in metadata after loading
  useEffect(() => {
    if (projectId) {
      updateMetadata({ projectId });
    }
  }, [projectId, updateMetadata]);

  // Close drawer handler
  const closeDrawer = useCallback(() => {
    setRightDrawerView(null);
    // Also deselect node when closing config drawer
    if (rightDrawerView === 'config') {
      selectNode(null);
    }
  }, [rightDrawerView, selectNode]);

  // Show loading state
  if (isLoading) {
    return <EditorSkeleton />;
  }

  // Show error state
  if (error !== null && error !== '') {
    return (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-accent-error/10 flex items-center justify-center mx-auto mb-4">
            <ExclamationCircleIcon className="w-6 h-6 text-accent-error" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Failed to load workflow
          </h2>
          <p className="text-sm text-text-tertiary mb-6">{error}</p>
          <Button
            variant="secondary"
            onClick={() => router.push(`/projects/${projectId}`)}
            icon={<ArrowLeftIcon className="w-4 h-4" />}
          >
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  const isExecuting =
    executionStatus === WorkflowStatus.Running ||
    executionStatus === WorkflowStatus.Paused;

  const isDrawerOpen = rightDrawerView !== null;

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full bg-bg-primary">
        {/* Toolbar with execution/history/settings buttons */}
        <WorkflowToolbar
          projectId={projectId}
          onExecutionClick={() => setRightDrawerView(rightDrawerView === 'execution' ? null : 'execution')}
          onHistoryClick={() => setRightDrawerView(rightDrawerView === 'history' ? null : 'history')}
          onSettingsClick={() => setRightDrawerView(rightDrawerView === 'settings' ? null : 'settings')}
          isExecuting={isExecuting}
          executionActive={rightDrawerView === 'execution'}
          historyActive={rightDrawerView === 'history'}
          settingsActive={rightDrawerView === 'settings'}
        />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Canvas */}
          <WorkflowCanvas />

          {/* Right: Sliding Drawer */}
          <>
            {/* Backdrop (subtle, only for config) */}
            {isDrawerOpen && (
              <div
                className={`
                  absolute inset-0 z-10
                  transition-opacity duration-200
                  ${rightDrawerView === 'config' ? 'bg-black/20' : 'bg-transparent pointer-events-none'}
                `}
                onClick={closeDrawer}
              />
            )}

            {/* Drawer Panel */}
            <div
              className={`
                absolute top-0 right-0 bottom-0 z-20
                w-80 bg-bg-secondary border-l border-border-default
                transform transition-transform duration-200 ease-out
                ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}
                flex flex-col
                shadow-xl shadow-black/20
              `}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between h-10 px-3 border-b border-border-default flex-shrink-0">
                <div className="flex items-center gap-2">
                  {rightDrawerView === 'execution' && (
                    <>
                      <PlayCircleIcon className={`w-4 h-4 ${isExecuting ? 'text-accent-success animate-pulse' : 'text-text-tertiary'}`} />
                      <span className="text-xs font-medium text-text-primary">Execution</span>
                    </>
                  )}
                  {rightDrawerView === 'history' && (
                    <>
                      <ClockIcon className="w-4 h-4 text-text-tertiary" />
                      <span className="text-xs font-medium text-text-primary">History</span>
                    </>
                  )}
                  {rightDrawerView === 'settings' && (
                    <>
                      <Cog6ToothIcon className="w-4 h-4 text-text-tertiary" />
                      <span className="text-xs font-medium text-text-primary">Settings</span>
                    </>
                  )}
                  {rightDrawerView === 'config' && (
                    <span className="text-xs font-medium text-text-primary">Node Config</span>
                  )}
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
                  aria-label="Close drawer"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-hidden">
                {rightDrawerView === 'config' && <NodeConfigPanel />}
                {rightDrawerView === 'execution' && (
                  <ExecutionPanel
                    isOpen={true}
                    onClose={closeDrawer}
                  />
                )}
                {rightDrawerView === 'history' && (
                  <div className="h-full overflow-y-auto p-4">
                    <ExecutionHistory
                      workflowId={workflowId}
                      onSelect={(executionId) => {
                        console.log('Selected execution:', executionId);
                      }}
                      onRetry={() => {
                        // TODO: Retry failed execution
                      }}
                    />
                  </div>
                )}
                {rightDrawerView === 'settings' && (
                  <div className="h-full overflow-y-auto">
                    <DockerImageConfig workflowId={workflowId} />
                    <EnvEditor mode="encrypted" workflowId={workflowId} />
                  </div>
                )}
              </div>
            </div>
          </>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
