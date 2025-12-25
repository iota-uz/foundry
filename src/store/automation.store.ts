/**
 * Automation Store
 *
 * Manages automation state for project workflow triggers.
 * Features:
 * - Automation CRUD operations
 * - Transition management
 * - Loading and error states
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface Transition {
  id: string;
  automationId: string;
  condition: 'success' | 'failure' | 'custom';
  customExpression: string | null;
  nextStatus: string;
}

export interface Automation {
  id: string;
  projectId: string;
  triggerType: 'status_enter' | 'manual';
  triggerStatus: string | null;
  buttonLabel: string | null;
  workflowId: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  transitions: Transition[];
}

export interface CreateAutomationData {
  triggerType: 'status_enter' | 'manual';
  triggerStatus?: string;
  buttonLabel?: string;
  workflowId: string;
  enabled?: boolean;
  priority?: number;
}

export interface UpdateAutomationData {
  triggerType?: 'status_enter' | 'manual';
  triggerStatus?: string | null;
  buttonLabel?: string | null;
  workflowId?: string;
  enabled?: boolean;
  priority?: number;
}

export interface CreateTransitionData {
  condition: 'success' | 'failure' | 'custom';
  customExpression?: string | undefined;
  nextStatus: string;
}

export interface UpdateTransitionData {
  condition?: 'success' | 'failure' | 'custom';
  customExpression?: string | null;
  nextStatus?: string;
}

// ============================================================================
// Store State & Actions
// ============================================================================

interface AutomationState {
  // Data
  automations: Automation[];
  selectedAutomation: Automation | null;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  fetchAutomations: (projectId: string) => Promise<void>;
  createAutomation: (projectId: string, data: CreateAutomationData) => Promise<Automation>;
  updateAutomation: (projectId: string, id: string, data: UpdateAutomationData) => Promise<void>;
  deleteAutomation: (projectId: string, id: string) => Promise<void>;
  toggleAutomation: (projectId: string, id: string, enabled: boolean) => Promise<void>;

  // Transition actions
  createTransition: (projectId: string, automationId: string, data: CreateTransitionData) => Promise<void>;
  updateTransition: (projectId: string, automationId: string, id: string, data: UpdateTransitionData) => Promise<void>;
  deleteTransition: (projectId: string, automationId: string, id: string) => Promise<void>;

  // Selection
  setSelectedAutomation: (automation: Automation | null) => void;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

const initialState = {
  automations: [],
  selectedAutomation: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

export const useAutomationStore = create<AutomationState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Fetch all automations for a project
      fetchAutomations: async (projectId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/projects/${projectId}/automations`);
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch automations');
          }

          const { data } = await response.json() as { data: Automation[] };
          set({ automations: data, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch automations',
            isLoading: false,
          });
        }
      },

      // Create new automation
      createAutomation: async (projectId: string, data: CreateAutomationData) => {
        set({ isSaving: true, error: null });

        try {
          const response = await fetch(`/api/projects/${projectId}/automations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to create automation');
          }

          const { data: automation } = await response.json() as { data: Automation };

          set((state) => ({
            automations: [...state.automations, automation],
            isSaving: false,
          }));

          return automation;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create automation',
            isSaving: false,
          });
          throw error;
        }
      },

      // Update automation
      updateAutomation: async (projectId: string, id: string, data: UpdateAutomationData) => {
        set({ isSaving: true, error: null });

        try {
          const response = await fetch(`/api/projects/${projectId}/automations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to update automation');
          }

          const { data: automation } = await response.json() as { data: Automation };

          set((state) => ({
            automations: state.automations.map((a) => (a.id === id ? automation : a)),
            selectedAutomation: state.selectedAutomation?.id === id ? automation : state.selectedAutomation,
            isSaving: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update automation',
            isSaving: false,
          });
          throw error;
        }
      },

      // Delete automation
      deleteAutomation: async (projectId: string, id: string) => {
        set({ isSaving: true, error: null });

        try {
          const response = await fetch(`/api/projects/${projectId}/automations/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete automation');
          }

          set((state) => ({
            automations: state.automations.filter((a) => a.id !== id),
            selectedAutomation: state.selectedAutomation?.id === id ? null : state.selectedAutomation,
            isSaving: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete automation',
            isSaving: false,
          });
          throw error;
        }
      },

      // Toggle enabled state
      toggleAutomation: async (projectId: string, id: string, enabled: boolean) => {
        // Optimistic update
        set((state) => ({
          automations: state.automations.map((a) =>
            a.id === id ? { ...a, enabled } : a
          ),
        }));

        try {
          await get().updateAutomation(projectId, id, { enabled });
        } catch {
          // Rollback on failure
          set((state) => ({
            automations: state.automations.map((a) =>
              a.id === id ? { ...a, enabled: !enabled } : a
            ),
          }));
        }
      },

      // Create transition
      createTransition: async (projectId: string, automationId: string, data: CreateTransitionData) => {
        set({ isSaving: true, error: null });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/automations/${automationId}/transitions`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            }
          );

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to create transition');
          }

          const { data: transition } = await response.json() as { data: Transition };

          set((state) => ({
            automations: state.automations.map((a) =>
              a.id === automationId
                ? { ...a, transitions: [...a.transitions, transition] }
                : a
            ),
            selectedAutomation:
              state.selectedAutomation?.id === automationId
                ? { ...state.selectedAutomation, transitions: [...state.selectedAutomation.transitions, transition] }
                : state.selectedAutomation,
            isSaving: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create transition',
            isSaving: false,
          });
          throw error;
        }
      },

      // Update transition
      updateTransition: async (
        projectId: string,
        automationId: string,
        id: string,
        data: UpdateTransitionData
      ) => {
        set({ isSaving: true, error: null });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/automations/${automationId}/transitions/${id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            }
          );

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to update transition');
          }

          const { data: transition } = await response.json() as { data: Transition };

          set((state) => ({
            automations: state.automations.map((a) =>
              a.id === automationId
                ? { ...a, transitions: a.transitions.map((t) => (t.id === id ? transition : t)) }
                : a
            ),
            selectedAutomation:
              state.selectedAutomation?.id === automationId
                ? {
                    ...state.selectedAutomation,
                    transitions: state.selectedAutomation.transitions.map((t) =>
                      t.id === id ? transition : t
                    ),
                  }
                : state.selectedAutomation,
            isSaving: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update transition',
            isSaving: false,
          });
          throw error;
        }
      },

      // Delete transition
      deleteTransition: async (projectId: string, automationId: string, id: string) => {
        set({ isSaving: true, error: null });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/automations/${automationId}/transitions/${id}`,
            {
              method: 'DELETE',
            }
          );

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete transition');
          }

          set((state) => ({
            automations: state.automations.map((a) =>
              a.id === automationId
                ? { ...a, transitions: a.transitions.filter((t) => t.id !== id) }
                : a
            ),
            selectedAutomation:
              state.selectedAutomation?.id === automationId
                ? {
                    ...state.selectedAutomation,
                    transitions: state.selectedAutomation.transitions.filter((t) => t.id !== id),
                  }
                : state.selectedAutomation,
            isSaving: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete transition',
            isSaving: false,
          });
          throw error;
        }
      },

      // Set selected automation
      setSelectedAutomation: (automation: Automation | null) => {
        set({ selectedAutomation: automation });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set(initialState);
      },
    }),
    { name: 'automation-store' }
  )
);
