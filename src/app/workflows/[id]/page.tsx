/**
 * Workflow Editor Page
 *
 * Production-grade visual workflow builder with Linear/Vercel-inspired styling.
 * Features:
 * - Polished loading state with skeleton
 * - Clean error state
 * - Smooth tab transitions
 * - Auto-switching between panels
 */

'use client';

import React, { useEffect, useState, use } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useRouter } from 'next/navigation';
import {
  PlayCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore, useWorkflowExecutionStore } from '@/store';
import {
  WorkflowCanvas,
  WorkflowToolbar,
  NodeLibrarySidebar,
  NodeConfigPanel,
  ExecutionPanel,
  ExecutionHistory,
} from '@/components/workflow-builder';
import { WorkflowStatus } from '@/lib/graph/enums';
import { Button, Skeleton } from '@/components/shared';

interface PageProps {
  params: Promise<{ id: string }>;
}

type RightPanelView = 'config' | 'execution' | 'history';

// ============================================================================
// Loading Skeleton
// ============================================================================

function EditorSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
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

        {/* Right panel skeleton */}
        <div className="w-80 border-l border-border-default bg-bg-secondary">
          <div className="flex border-b border-border-default">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="flex-1 h-10 mx-1" />
            ))}
          </div>
          <div className="p-4 space-y-4">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-full h-9 rounded-lg" />
            <Skeleton className="w-full h-9 rounded-lg" />
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
  const { id } = use(params);
  const router = useRouter();
  const { loadWorkflow, isLoading, error, selectedNodeId } =
    useWorkflowBuilderStore();
  const { status: executionStatus, reset: resetExecution } =
    useWorkflowExecutionStore();

  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('config');

  // Auto-switch to execution panel when running
  useEffect(() => {
    if (
      executionStatus === WorkflowStatus.Running ||
      executionStatus === WorkflowStatus.Paused
    ) {
      setRightPanelView('execution');
    }
  }, [executionStatus]);

  // Auto-switch to config when a node is selected
  useEffect(() => {
    if (selectedNodeId && rightPanelView !== 'config') {
      setRightPanelView('config');
    }
  }, [selectedNodeId, rightPanelView]);

  useEffect(() => {
    if (id) {
      loadWorkflow(id);
      // Reset execution state when loading a new workflow
      resetExecution();
    }
  }, [id, loadWorkflow, resetExecution]);

  // Show loading state
  if (isLoading) {
    return <EditorSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
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
            onClick={() => router.push('/')}
            icon={<ArrowLeftIcon className="w-4 h-4" />}
          >
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  const isExecuting =
    executionStatus === WorkflowStatus.Running ||
    executionStatus === WorkflowStatus.Paused;

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-bg-primary">
        {/* Toolbar */}
        <WorkflowToolbar />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Node library */}
          <NodeLibrarySidebar />

          {/* Center: Canvas */}
          <WorkflowCanvas />

          {/* Right: Panel with tabs */}
          <div className="w-80 flex flex-col border-l border-border-default bg-bg-secondary">
            {/* Tab buttons */}
            <div className="flex h-10 border-b border-border-default bg-bg-secondary flex-shrink-0">
              <TabButton
                active={rightPanelView === 'config'}
                onClick={() => setRightPanelView('config')}
                icon={<Cog6ToothIcon className="w-4 h-4" />}
                label="Config"
              />
              <TabButton
                active={rightPanelView === 'execution'}
                onClick={() => setRightPanelView('execution')}
                icon={
                  <PlayCircleIcon
                    className={`w-4 h-4 ${isExecuting ? 'animate-pulse' : ''}`}
                  />
                }
                label="Execution"
                highlight={isExecuting}
              />
              <TabButton
                active={rightPanelView === 'history'}
                onClick={() => setRightPanelView('history')}
                icon={<ClockIcon className="w-4 h-4" />}
                label="History"
              />
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden">
              {rightPanelView === 'config' && <NodeConfigPanel />}
              {rightPanelView === 'execution' && (
                <ExecutionPanel
                  isOpen={true}
                  onClose={() => setRightPanelView('config')}
                />
              )}
              {rightPanelView === 'history' && (
                <div className="h-full overflow-y-auto p-4">
                  <ExecutionHistory
                    workflowId={id}
                    onSelect={(executionId) => {
                      // TODO: Load execution details
                      console.log('Selected execution:', executionId);
                    }}
                    onRetry={() => {
                      // TODO: Retry failed execution
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

// ============================================================================
// Tab Button Component
// ============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}

function TabButton({ active, onClick, icon, label, highlight }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1.5
        text-xs font-medium
        transition-colors duration-150
        relative
        ${
          active
            ? 'text-text-primary'
            : highlight
              ? 'text-accent-primary'
              : 'text-text-tertiary hover:text-text-secondary'
        }
      `}
    >
      {icon}
      <span>{label}</span>

      {/* Active indicator */}
      {active && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent-primary rounded-full" />
      )}
    </button>
  );
}
