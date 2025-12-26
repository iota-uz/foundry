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
import {
  createAutomationAction,
  updateAutomationAction,
  deleteAutomationAction,
  createTransitionAction,
  updateTransitionAction,
  deleteTransitionAction,
} from '@/lib/actions/automations';

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
  name: string;
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
  name: string;
  triggerType: 'status_enter' | 'manual';
  triggerStatus?: string;
  buttonLabel?: string;
  workflowId: string;
  enabled?: boolean;
  priority?: number;
}

export interface UpdateAutomationData {
  name?: string;
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
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to fetch automations');
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

        const result = await createAutomationAction({
          projectId,
          name: data.name,
          triggerType: data.triggerType,
          triggerStatus: data.triggerStatus,
          buttonLabel: data.buttonLabel,
          workflowId: data.workflowId,
          enabled: data.enabled,
          priority: data.priority,
        });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isSaving: false });
          throw new Error(error);
        }

        if (result.data === undefined) {
          const errMsg = 'Unexpected error: no data returned';
          set({ error: errMsg, isSaving: false });
          throw new Error(errMsg);
        }

        const automation = result.data.automation as unknown as Automation;

        set((state) => ({
          automations: [...state.automations, automation],
          isSaving: false,
        }));

        return automation;
      },

      // Update automation
      updateAutomation: async (projectId: string, id: string, data: UpdateAutomationData) => {
        set({ isSaving: true, error: null });

        const result = await updateAutomationAction({
          projectId,
          automationId: id,
          ...data,
        });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isSaving: false });
          throw new Error(error);
        }

        if (result.data === undefined) {
          const errMsg = 'Unexpected error: no data returned';
          set({ error: errMsg, isSaving: false });
          throw new Error(errMsg);
        }

        const automation = result.data.automation as unknown as Automation;

        set((state) => ({
          automations: state.automations.map((a) => (a.id === id ? automation : a)),
          selectedAutomation: state.selectedAutomation?.id === id ? automation : state.selectedAutomation,
          isSaving: false,
        }));
      },

      // Delete automation
      deleteAutomation: async (projectId: string, id: string) => {
        set({ isSaving: true, error: null });

        const result = await deleteAutomationAction({ projectId, automationId: id });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isSaving: false });
          throw new Error(error);
        }

        set((state) => ({
          automations: state.automations.filter((a) => a.id !== id),
          selectedAutomation: state.selectedAutomation?.id === id ? null : state.selectedAutomation,
          isSaving: false,
        }));
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

        const result = await createTransitionAction({
          projectId,
          automationId,
          condition: data.condition,
          customExpression: data.customExpression,
          nextStatus: data.nextStatus,
        });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isSaving: false });
          throw new Error(error);
        }

        if (result.data === undefined) {
          const errMsg = 'Unexpected error: no data returned';
          set({ error: errMsg, isSaving: false });
          throw new Error(errMsg);
        }

        const transition = result.data.transition as unknown as Transition;

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
      },

      // Update transition
      updateTransition: async (
        projectId: string,
        automationId: string,
        id: string,
        data: UpdateTransitionData
      ) => {
        set({ isSaving: true, error: null });

        const result = await updateTransitionAction({
          projectId,
          automationId,
          transitionId: id,
          ...data,
        });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isSaving: false });
          throw new Error(error);
        }

        if (result.data === undefined) {
          const errMsg = 'Unexpected error: no data returned';
          set({ error: errMsg, isSaving: false });
          throw new Error(errMsg);
        }

        const transition = result.data.transition as unknown as Transition;

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
      },

      // Delete transition
      deleteTransition: async (projectId: string, automationId: string, id: string) => {
        set({ isSaving: true, error: null });

        const result = await deleteTransitionAction({
          projectId,
          automationId,
          transitionId: id,
        });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isSaving: false });
          throw new Error(error);
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
