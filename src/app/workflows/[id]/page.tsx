/**
 * Workflow Editor Page
 *
 * Visual workflow builder with drag-and-drop canvas.
 * Includes execution panel and history.
 */

'use client';

import React, { useEffect, useState, use } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useRouter } from 'next/navigation';
import {
  PlayCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
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

interface PageProps {
  params: Promise<{ id: string }>;
}

type RightPanelView = 'config' | 'execution' | 'history';

export default function WorkflowEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { loadWorkflow, isLoading, error, selectedNodeId } = useWorkflowBuilderStore();
  const { status: executionStatus, reset: resetExecution } = useWorkflowExecutionStore();

  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('config');

  // Auto-switch to execution panel when running
  useEffect(() => {
    if (executionStatus === WorkflowStatus.Running || executionStatus === WorkflowStatus.Paused) {
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
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">Loading workflow...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-lg bg-bg-secondary text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            Back to Workflows
          </button>
        </div>
      </div>
    );
  }

  const isExecuting = executionStatus === WorkflowStatus.Running || executionStatus === WorkflowStatus.Paused;

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
            <div className="flex border-b border-border-default">
              <button
                onClick={() => setRightPanelView('config')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors ${
                  rightPanelView === 'config'
                    ? 'text-text-primary border-b-2 border-blue-500 bg-bg-tertiary'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Config
              </button>
              <button
                onClick={() => setRightPanelView('execution')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors ${
                  rightPanelView === 'execution'
                    ? 'text-text-primary border-b-2 border-blue-500 bg-bg-tertiary'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
                } ${isExecuting ? 'text-blue-400' : ''}`}
              >
                <PlayCircleIcon className={`w-4 h-4 ${isExecuting ? 'animate-pulse' : ''}`} />
                Execution
              </button>
              <button
                onClick={() => setRightPanelView('history')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors ${
                  rightPanelView === 'history'
                    ? 'text-text-primary border-b-2 border-blue-500 bg-bg-tertiary'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                History
              </button>
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
