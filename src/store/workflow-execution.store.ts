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
import {
  startExecutionAction,
  pauseExecutionAction,
  resumeExecutionAction,
  cancelExecutionAction,
} from '@/lib/actions/executions';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract error message from server action result
 * next-safe-action validationErrors uses _errors arrays on each field
 */
function extractActionError(result: {
  serverError?: string;
  validationErrors?: unknown;
}): string | null {
  if (result.serverError !== undefined && result.serverError !== '') {
    return result.serverError;
  }
  if (result.validationErrors !== null && result.validationErrors !== undefined && typeof result.validationErrors === 'object') {
    const errors = result.validationErrors as Record<string, unknown>;
    // Check for root-level errors first
    const rootErrors = errors._errors;
    if (Array.isArray(rootErrors) && rootErrors.length > 0 && typeof rootErrors[0] === 'string') {
      return rootErrors[0];
    }
    // Check for field-level errors
    for (const [key, value] of Object.entries(errors)) {
      if (key !== '_errors' && value !== null && value !== undefined && typeof value === 'object' && '_errors' in value) {
        const fieldErrors = (value as { _errors?: unknown })._errors;
        if (Array.isArray(fieldErrors) && fieldErrors.length > 0 && typeof fieldErrors[0] === 'string') {
          return fieldErrors[0];
        }
      }
    }
    return 'Validation failed';
  }
  return null;
}

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

        const result = await startExecutionAction({ workflowId });

        const error = extractActionError(result);
        if (error !== null) {
          set({ status: WorkflowStatus.Failed });
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error,
          });
          return;
        }

        if (result.data === undefined) {
          set({ status: WorkflowStatus.Failed });
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Unexpected error: no data returned',
          });
          return;
        }

        const executionId = result.data.executionId;

        set({
          executionId,
          workflowId,
          status: WorkflowStatus.Running,
        });

        // Connect to SSE for real-time updates
        get().connectToExecution(executionId);
      },

      // Pause current execution
      pauseExecution: async () => {
        const { executionId } = get();
        if (executionId === null) return;

        const result = await pauseExecutionAction({ executionId });

        const error = extractActionError(result);
        if (error !== null) {
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error,
          });
          return;
        }

        set({ status: WorkflowStatus.Paused });
      },

      // Resume paused execution
      resumeExecution: async () => {
        const { executionId } = get();
        if (executionId === null) return;

        const result = await resumeExecutionAction({ executionId });

        const error = extractActionError(result);
        if (error !== null) {
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error,
          });
          return;
        }

        set({ status: WorkflowStatus.Running });
      },

      // Cancel current execution
      cancelExecution: async () => {
        const { executionId } = get();
        if (executionId === null) return;

        const result = await cancelExecutionAction({ executionId });

        const error = extractActionError(result);
        if (error !== null) {
          get().addLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error,
          });
          return;
        }

        get().disconnectFromExecution();
        set({ status: WorkflowStatus.Failed });
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
            const data = JSON.parse(event.data as string) as {
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
                if (data.nodeId !== undefined && data.nodeId !== null && data.nodeId !== '') {
                  get().updateNodeState(data.nodeId, {
                    status: 'running',
                    startedAt: new Date().toISOString(),
                  });
                  set({ currentNodeId: data.nodeId });
                }
                break;

              case 'node_completed':
                if (data.nodeId !== undefined && data.nodeId !== null && data.nodeId !== '') {
                  get().updateNodeState(data.nodeId, {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    output: data.nodeState?.output,
                  });
                }
                break;

              case 'node_failed':
                if (data.nodeId !== undefined && data.nodeId !== null && data.nodeId !== '') {
                  get().updateNodeState(data.nodeId, {
                    status: 'failed',
                    completedAt: new Date().toISOString(),
                    ...(data.nodeState?.error !== undefined && data.nodeState.error !== null && data.nodeState.error !== '' && { error: data.nodeState.error }),
                  });
                }
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

              case 'workflow_resumed':
                set({ status: WorkflowStatus.Running });
                if (data.currentNodeId !== undefined && data.currentNodeId !== null && data.currentNodeId !== '') {
                  set({ currentNodeId: data.currentNodeId });
                }
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
