/**
 * Workflow state management with Zustand
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  WorkflowState,
  WorkflowId,
} from '@/types';

interface WorkflowStore {
  // State
  workflowState: WorkflowState | null;
  currentQuestion: any | null; // AIQuestion type
  loading: boolean;
  error: string | null;
  sseConnected: boolean;

  // Workflow actions
  startWorkflow: (workflowId: WorkflowId) => Promise<void>;
  pauseWorkflow: () => Promise<void>;
  resumeWorkflow: () => Promise<void>;
  answerQuestion: (questionId: string, answer: any) => Promise<void>;
  skipQuestion: () => Promise<void>;
  retryStep: (stepId: string) => Promise<void>;

  // Clarify actions
  resolveAmbiguity: (id: string, resolution: string) => Promise<void>;
  deferAmbiguity: (id: string) => Promise<void>;

  // SSE management
  connectSSE: () => void;
  disconnectSSE: () => void;

  // Internal updates (called by SSE handlers)
  updateWorkflowState: (state: WorkflowState) => void;
  setCurrentQuestion: (question: any | null) => void;
}

let eventSource: EventSource | null = null;

export const useWorkflowStore = create<WorkflowStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      workflowState: null,
      currentQuestion: null,
      loading: false,
      error: null,
      sseConnected: false,

      // Workflow actions
      startWorkflow: async (workflowId: WorkflowId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/workflow/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflowId }),
          });

          if (!response.ok) {
            throw new Error('Failed to start workflow');
          }

          const data = await response.json();
          set({
            workflowState: data.state,
            loading: false,
          });

          // Connect to SSE for updates
          get().connectSSE();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      pauseWorkflow: async () => {
        const { workflowState } = get();
        if (!workflowState) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/workflow/pause', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: workflowState.sessionId }),
          });

          if (!response.ok) {
            throw new Error('Failed to pause workflow');
          }

          const data = await response.json();
          set({
            workflowState: data.state,
            loading: false,
          });

          // Disconnect SSE
          get().disconnectSSE();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      resumeWorkflow: async () => {
        const { workflowState } = get();
        if (!workflowState) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/workflow/resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: workflowState.sessionId }),
          });

          if (!response.ok) {
            throw new Error('Failed to resume workflow');
          }

          const data = await response.json();
          set({
            workflowState: data.state,
            loading: false,
          });

          // Reconnect to SSE
          get().connectSSE();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      answerQuestion: async (questionId: string, answer: any) => {
        const { workflowState } = get();
        if (!workflowState) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/workflow/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: workflowState.sessionId,
              questionId,
              answer,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to submit answer');
          }

          // Clear current question
          set({
            currentQuestion: null,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      skipQuestion: async () => {
        const { workflowState, currentQuestion } = get();
        if (!workflowState || !currentQuestion) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/workflow/skip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: workflowState.sessionId,
              questionId: currentQuestion.id,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to skip question');
          }

          set({
            currentQuestion: null,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      retryStep: async (stepId: string) => {
        const { workflowState } = get();
        if (!workflowState) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/workflow/retry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: workflowState.sessionId,
              stepId,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to retry step');
          }

          set({ loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      // Clarify actions
      resolveAmbiguity: async (id: string, resolution: string) => {
        const { workflowState } = get();
        if (!workflowState) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/workflow/clarify/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: workflowState.sessionId,
              ambiguityId: id,
              resolution,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to resolve ambiguity');
          }

          set({ loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      deferAmbiguity: async (id: string) => {
        const { workflowState } = get();
        if (!workflowState) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/workflow/clarify/defer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: workflowState.sessionId,
              ambiguityId: id,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to defer ambiguity');
          }

          set({ loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      // SSE management
      connectSSE: () => {
        const { workflowState } = get();
        if (!workflowState || eventSource) return;

        eventSource = new EventSource(
          `/api/workflow/stream?sessionId=${workflowState.sessionId}`
        );

        eventSource.onopen = () => {
          set({ sseConnected: true });
        };

        eventSource.addEventListener('state', (event) => {
          const data = JSON.parse(event.data);
          set({ workflowState: data });
        });

        eventSource.addEventListener('question', (event) => {
          const data = JSON.parse(event.data);
          set({ currentQuestion: data });
        });

        eventSource.addEventListener('complete', () => {
          get().disconnectSSE();
        });

        eventSource.addEventListener('error', () => {
          set({
            sseConnected: false,
            error: 'Connection to workflow stream lost',
          });
        });

        eventSource.onerror = () => {
          get().disconnectSSE();
        };
      },

      disconnectSSE: () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        set({ sseConnected: false });
      },

      // Internal updates
      updateWorkflowState: (state: WorkflowState) => {
        set({ workflowState: state });
      },

      setCurrentQuestion: (question: any | null) => {
        set({ currentQuestion: question });
      },
    }),
    { name: 'workflow-store' }
  )
);
