/**
 * Workflow Execution Store
 *
 * Manages the real-time execution state of workflows including:
 * - Execution status and progress
 * - Node execution states
 * - Execution logs
 * - Pause/resume/cancel controls
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WorkflowStatus } from '@/lib/graph/enums';

// ============================================================================
// Types
// ============================================================================

/**
 * Individual node execution state
 */
export interface NodeExecutionState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: unknown;
}

/**
 * Log entry from execution
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Store State & Actions
// ============================================================================

interface WorkflowExecutionState {
  // Execution state
  executionId: string | null;
  workflowId: string | null;
  status: WorkflowStatus;
  currentNodeId: string | null;
  nodeStates: Record<string, NodeExecutionState>;
  context: Record<string, unknown>;

  // Logs
  logs: LogEntry[];
  maxLogs: number;

  // SSE connection
  eventSource: EventSource | null;

  // Actions
  startExecution: (workflowId: string) => Promise<void>;
  pauseExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>;
  cancelExecution: () => Promise<void>;

  // State updates (from SSE)
  updateExecutionState: (update: Partial<WorkflowExecutionState>) => void;
  updateNodeState: (nodeId: string, state: Partial<NodeExecutionState>) => void;
  addLog: (log: Omit<LogEntry, 'id'>) => void;

  // Connection management
  connectToExecution: (executionId: string) => void;
  disconnectFromExecution: () => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useWorkflowExecutionStore = create<WorkflowExecutionState>()(
  devtools(
    (set, get) => ({
      // Initial state
      executionId: null,
      workflowId: null,
      status: WorkflowStatus.Pending,
      currentNodeId: null,
      nodeStates: {},
      context: {},
      logs: [],
      maxLogs: 1000,
      eventSource: null,

      // Start a new execution
      startExecution: async (workflowId: string) => {
        set({ status: WorkflowStatus.Pending, logs: [], nodeStates: {} });

        try {
          const response = await fetch(`/api/workflows/${workflowId}/execute`, {
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error('Failed to start execution');
          }

          const result = await response.json() as { executionId: string };
          const executionId = result.executionId;

          set({
            executionId,
            workflowId,
            status: WorkflowStatus.Running,
          });

          // Connect to SSE for real-time updates
          get().connectToExecution(executionId);
        } catch (error) {
          set({ status: WorkflowStatus.Failed });
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error instanceof Error ? error.message : 'Failed to start',
          });
        }
      },

      // Pause current execution
      pauseExecution: async () => {
        const { executionId } = get();
        if (!executionId) return;

        try {
          const response = await fetch(
            `/api/workflows/executions/${executionId}/pause`,
            { method: 'POST' }
          );

          if (!response.ok) {
            throw new Error('Failed to pause execution');
          }

          set({ status: WorkflowStatus.Paused });
        } catch (error) {
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error instanceof Error ? error.message : 'Failed to pause',
          });
        }
      },

      // Resume paused execution
      resumeExecution: async () => {
        const { executionId } = get();
        if (!executionId) return;

        try {
          const response = await fetch(
            `/api/workflows/executions/${executionId}/resume`,
            { method: 'POST' }
          );

          if (!response.ok) {
            throw new Error('Failed to resume execution');
          }

          set({ status: WorkflowStatus.Running });
        } catch (error) {
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error instanceof Error ? error.message : 'Failed to resume',
          });
        }
      },

      // Cancel current execution
      cancelExecution: async () => {
        const { executionId } = get();
        if (!executionId) return;

        try {
          const response = await fetch(
            `/api/workflows/executions/${executionId}/cancel`,
            { method: 'POST' }
          );

          if (!response.ok) {
            throw new Error('Failed to cancel execution');
          }

          get().disconnectFromExecution();
          set({ status: WorkflowStatus.Failed });
        } catch (error) {
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error instanceof Error ? error.message : 'Failed to cancel',
          });
        }
      },

      // Update execution state from SSE
      updateExecutionState: (update) => {
        set((state) => ({
          ...state,
          ...update,
        }));
      },

      // Update individual node state
      updateNodeState: (nodeId: string, nodeState: Partial<NodeExecutionState>) => {
        set((state) => ({
          nodeStates: {
            ...state.nodeStates,
            [nodeId]: {
              ...state.nodeStates[nodeId],
              ...nodeState,
            } as NodeExecutionState,
          },
        }));
      },

      // Add log entry
      addLog: (log) => {
        const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        set((state) => ({
          logs: [...state.logs.slice(-state.maxLogs + 1), { ...log, id }],
        }));
      },

      // Connect to SSE stream
      connectToExecution: (executionId: string) => {
        // Disconnect existing connection
        get().disconnectFromExecution();

        const eventSource = new EventSource(
          `/api/workflows/executions/${executionId}/stream`
        );

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as {
              type: string;
              nodeId?: string;
              status?: WorkflowStatus;
              currentNodeId?: string;
              context?: Record<string, unknown>;
              nodeState?: Partial<NodeExecutionState>;
              log?: Omit<LogEntry, 'id'>;
            };

            switch (data.type) {
              case 'node_started':
                get().updateNodeState(data.nodeId!, {
                  status: 'running',
                  startedAt: new Date().toISOString(),
                });
                set({ currentNodeId: data.nodeId! });
                break;

              case 'node_completed':
                get().updateNodeState(data.nodeId!, {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                  output: data.nodeState?.output,
                });
                break;

              case 'node_failed':
                get().updateNodeState(data.nodeId!, {
                  status: 'failed',
                  completedAt: new Date().toISOString(),
                  ...(data.nodeState?.error && { error: data.nodeState.error }),
                });
                break;

              case 'workflow_completed':
                set({ status: WorkflowStatus.Completed, currentNodeId: null });
                get().disconnectFromExecution();
                break;

              case 'workflow_failed':
                set({ status: WorkflowStatus.Failed, currentNodeId: null });
                get().disconnectFromExecution();
                break;

              case 'workflow_paused':
                set({ status: WorkflowStatus.Paused });
                break;

              case 'context_updated':
                set({ context: data.context ?? {} });
                break;

              case 'log':
                if (data.log) {
                  get().addLog(data.log);
                }
                break;
            }
          } catch {
            console.error('Failed to parse SSE message');
          }
        };

        eventSource.onerror = () => {
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Lost connection to execution stream',
          });
          eventSource.close();
          set({ eventSource: null });
        };

        set({ eventSource });
      },

      // Disconnect from SSE stream
      disconnectFromExecution: () => {
        const { eventSource } = get();
        if (eventSource) {
          eventSource.close();
          set({ eventSource: null });
        }
      },

      // Reset store state
      reset: () => {
        get().disconnectFromExecution();
        set({
          executionId: null,
          workflowId: null,
          status: WorkflowStatus.Pending,
          currentNodeId: null,
          nodeStates: {},
          context: {},
          logs: [],
        });
      },
    }),
    { name: 'workflow-execution' }
  )
);
