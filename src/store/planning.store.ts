/**
 * Planning Store
 *
 * Manages state for the AI-powered issue planning workflow.
 * Features:
 * - 3-phase Q&A workflow (Requirements, Clarify, Technical)
 * - Batched question handling
 * - Real-time artifact updates via SSE
 * - Planning session management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  PlanContent,
  PlanningPhase,
  PlanningStatus,
  QuestionBatch,
  Answer,
  PlanArtifacts,
  MermaidDiagram,
  ImplementationTask,
  ComponentSpec,
  APISpec,
  StartPlanResponse,
  SubmitAnswersRequest,
  AgentActivityEvent,
} from '@/lib/planning/types';

// ============================================================================
// Types
// ============================================================================

interface PlanningState {
  // Session
  sessionId: string | null;
  projectId: string | null;
  issueId: string | null;
  issueTitle: string;
  issueBody: string;

  // Phase tracking
  status: PlanningStatus;
  currentPhase: PlanningPhase;
  phaseProgress: Record<PlanningPhase, { completed: boolean; questionsAnswered: number }>;

  // Q&A state
  questionBatches: QuestionBatch[];
  currentBatch: QuestionBatch | null;
  currentBatchIndex: number;
  answers: Record<string, Answer>;

  // Artifacts
  artifacts: PlanArtifacts;

  // Layout preferences
  layout: {
    qaWidth: number;
    previewWidth: number;
    previewMode: 'summary' | 'diff' | 'full';
  };

  // Connection state
  eventSource: EventSource | null;
  connected: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Activity state (real-time agent activity streaming)
  activities: AgentActivityEvent[];
  activityDrawerOpen: boolean;
  maxActivities: number;

  // Actions
  startPlanning: (projectId: string, issueId: string, issueTitle: string, issueBody: string) => Promise<void>;
  submitAnswers: (answers: SubmitAnswersRequest['answers'], skippedQuestions?: string[]) => Promise<void>;
  pausePlanning: () => Promise<void>;
  resumePlanning: () => Promise<void>;
  cancelPlanning: () => Promise<void>;
  loadExistingPlan: (projectId: string, issueId: string, issueTitle: string, issueBody: string) => Promise<void>;
  connectSSE: () => void;
  disconnectSSE: () => void;
  setPreviewMode: (mode: 'summary' | 'diff' | 'full') => void;
  clearError: () => void;
  reset: () => void;
  // Activity actions
  addActivity: (activity: AgentActivityEvent) => void;
  clearActivities: () => void;
  toggleActivityDrawer: () => void;
  setActivityDrawerOpen: (open: boolean) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialArtifacts: PlanArtifacts = {
  diagrams: [],
  tasks: [],
  uiMockups: [],
  apiSpecs: [],
};

const initialPhaseProgress: Record<PlanningPhase, { completed: boolean; questionsAnswered: number }> = {
  requirements: { completed: false, questionsAnswered: 0 },
  clarify: { completed: false, questionsAnswered: 0 },
  technical: { completed: false, questionsAnswered: 0 },
};

const initialState = {
  sessionId: null,
  projectId: null,
  issueId: null,
  issueTitle: '',
  issueBody: '',
  status: 'not_started' as PlanningStatus,
  currentPhase: 'requirements' as PlanningPhase,
  phaseProgress: initialPhaseProgress,
  questionBatches: [],
  currentBatch: null,
  currentBatchIndex: 0,
  answers: {},
  artifacts: initialArtifacts,
  layout: {
    qaWidth: 50,
    previewWidth: 50,
    previewMode: 'summary' as const,
  },
  eventSource: null,
  connected: false,
  isLoading: false,
  isSubmitting: false,
  error: null,
  // Activity state
  activities: [] as AgentActivityEvent[],
  activityDrawerOpen: false,
  maxActivities: 500,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const usePlanningStore = create<PlanningState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Start a new planning session
      startPlanning: async (projectId: string, issueId: string, issueTitle: string, issueBody: string) => {
        set({
          isLoading: true,
          error: null,
          projectId,
          issueId,
          issueTitle,
          issueBody,
        });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/issues/${issueId}/plan/start`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            }
          );

          if (!response.ok) {
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to start planning');
          }

          const data = await response.json() as StartPlanResponse;

          set({
            sessionId: data.sessionId,
            status: 'requirements',
            currentPhase: 'requirements',
            isLoading: false,
          });

          // Connect to SSE stream
          get().connectSSE();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to start planning',
            isLoading: false,
          });
        }
      },

      // Submit answers to current batch
      submitAnswers: async (answers, skippedQuestions = []) => {
        const { projectId, issueId, sessionId, currentBatch } = get();
        if (!projectId || !issueId || !sessionId || !currentBatch) {
          set({ error: 'No active planning session' });
          return;
        }

        set({ isSubmitting: true, error: null });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/issues/${issueId}/plan/answer`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                batchId: currentBatch.batchId,
                answers,
                skippedQuestions,
              }),
            }
          );

          if (!response.ok) {
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to submit answers');
          }

          // Store answers locally
          const newAnswers: Record<string, Answer> = { ...get().answers };
          for (const answer of answers) {
            newAnswers[answer.questionId] = {
              questionId: answer.questionId,
              value: answer.value,
              answeredAt: new Date().toISOString(),
              skipped: false,
            };
          }
          for (const questionId of skippedQuestions) {
            newAnswers[questionId] = {
              questionId,
              value: '',
              answeredAt: new Date().toISOString(),
              skipped: true,
            };
          }

          // Update phase progress
          const { currentPhase, phaseProgress } = get();
          const updatedProgress = {
            ...phaseProgress,
            [currentPhase]: {
              ...phaseProgress[currentPhase],
              questionsAnswered: phaseProgress[currentPhase].questionsAnswered + answers.length + skippedQuestions.length,
            },
          };

          set({
            answers: newAnswers,
            phaseProgress: updatedProgress,
            isSubmitting: false,
          });

          // SSE will handle the next batch or phase transition
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to submit answers',
            isSubmitting: false,
          });
        }
      },

      // Pause planning workflow
      pausePlanning: async () => {
        const { projectId, issueId, sessionId } = get();
        if (!projectId || !issueId || !sessionId) return;

        try {
          const response = await fetch(
            `/api/projects/${projectId}/issues/${issueId}/plan/pause`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            }
          );

          if (!response.ok) {
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to pause planning');
          }

          get().disconnectSSE();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to pause planning',
          });
        }
      },

      // Resume paused planning
      resumePlanning: async () => {
        const { projectId, issueId, sessionId } = get();
        if (!projectId || !issueId || !sessionId) return;

        set({ isLoading: true, error: null });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/issues/${issueId}/plan/resume`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            }
          );

          if (!response.ok) {
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to resume planning');
          }

          set({ isLoading: false });
          get().connectSSE();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to resume planning',
            isLoading: false,
          });
        }
      },

      // Cancel planning
      cancelPlanning: async () => {
        const { projectId, issueId, sessionId } = get();
        if (!projectId || !issueId || !sessionId) return;

        try {
          await fetch(
            `/api/projects/${projectId}/issues/${issueId}/plan/cancel`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            }
          );

          get().disconnectSSE();
          get().reset();
        } catch (_error) {
          // Reset anyway on cancel
          get().disconnectSSE();
          get().reset();
        }
      },

      // Load existing plan
      loadExistingPlan: async (projectId: string, issueId: string, issueTitle: string, issueBody: string) => {
        set({ isLoading: true, error: null, projectId, issueId, issueTitle, issueBody });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/issues/${issueId}/plan`
          );

          if (!response.ok) {
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to load plan');
          }

          const data = await response.json() as { planContent: PlanContent | null; sessionId?: string };

          if (data.planContent) {
            set({
              sessionId: data.planContent.sessionId,
              status: data.planContent.status,
              currentPhase: data.planContent.currentPhase,
              questionBatches: data.planContent.questionBatches,
              currentBatchIndex: data.planContent.currentBatchIndex,
              answers: data.planContent.answers,
              artifacts: data.planContent.artifacts,
              isLoading: false,
            });

            // Find current batch
            if (data.planContent.questionBatches.length > data.planContent.currentBatchIndex) {
              const batch = data.planContent.questionBatches[data.planContent.currentBatchIndex];
              if (batch) {
                set({ currentBatch: batch });
              }
            }

            // Connect SSE if still in progress
            if (data.planContent.status !== 'completed' && data.planContent.status !== 'failed') {
              get().connectSSE();
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load plan',
            isLoading: false,
          });
        }
      },

      // Connect to SSE stream
      connectSSE: () => {
        const { projectId, issueId, sessionId, eventSource: existingSource } = get();
        if (!projectId || !issueId || !sessionId) return;

        // Close existing connection
        if (existingSource) {
          existingSource.close();
        }

        const eventSource = new EventSource(
          `/api/projects/${projectId}/issues/${issueId}/plan/stream?sessionId=${sessionId}`
        );

        eventSource.onopen = () => {
          set({ connected: true });
        };

        eventSource.onerror = () => {
          set({ connected: false });
        };

        // Handle different event types
        eventSource.addEventListener('connected', () => {
          set({ connected: true });
        });

        eventSource.addEventListener('phase_started', (event) => {
          const data = JSON.parse(event.data) as { phase: PlanningPhase };
          set({ currentPhase: data.phase, status: data.phase });
        });

        eventSource.addEventListener('batch_generated', (event) => {
          const data = JSON.parse(event.data) as { batch: QuestionBatch };
          const batches = [...get().questionBatches, data.batch];
          set({
            questionBatches: batches,
            currentBatch: data.batch,
            currentBatchIndex: batches.length - 1,
          });
        });

        eventSource.addEventListener('phase_completed', (event) => {
          const data = JSON.parse(event.data) as { phase: PlanningPhase };
          const { phaseProgress } = get();
          set({
            phaseProgress: {
              ...phaseProgress,
              [data.phase]: { ...phaseProgress[data.phase], completed: true },
            },
          });
        });

        eventSource.addEventListener('artifact_generated', (event) => {
          const data = JSON.parse(event.data) as { artifactType: string; artifact: MermaidDiagram | ImplementationTask | ComponentSpec | APISpec };
          const { artifacts } = get();

          switch (data.artifactType) {
            case 'diagram':
              set({
                artifacts: {
                  ...artifacts,
                  diagrams: [...artifacts.diagrams, data.artifact as MermaidDiagram],
                },
              });
              break;
            case 'task':
              set({
                artifacts: {
                  ...artifacts,
                  tasks: [...artifacts.tasks, data.artifact as ImplementationTask],
                },
              });
              break;
            case 'uiMockup':
              set({
                artifacts: {
                  ...artifacts,
                  uiMockups: [...artifacts.uiMockups, data.artifact as ComponentSpec],
                },
              });
              break;
            case 'apiSpec':
              set({
                artifacts: {
                  ...artifacts,
                  apiSpecs: [...artifacts.apiSpecs, data.artifact as APISpec],
                },
              });
              break;
          }
        });

        eventSource.addEventListener('planning_completed', (event) => {
          const data = JSON.parse(event.data) as { summary: PlanArtifacts };
          set({
            status: 'completed',
            artifacts: data.summary,
          });
          get().disconnectSSE();
        });

        eventSource.addEventListener('planning_failed', (event) => {
          const data = JSON.parse(event.data) as { error: string };
          set({
            status: 'failed',
            error: data.error,
          });
          get().disconnectSSE();
        });

        // Handle agent activity events for real-time visibility
        eventSource.addEventListener('agent_activity', (event) => {
          const data = JSON.parse(event.data) as { activity: AgentActivityEvent };
          if (data.activity) {
            get().addActivity(data.activity);
          }
        });

        set({ eventSource });
      },

      // Disconnect SSE
      disconnectSSE: () => {
        const { eventSource } = get();
        if (eventSource) {
          eventSource.close();
          set({ eventSource: null, connected: false });
        }
      },

      // Set preview mode
      setPreviewMode: (mode) => {
        set({
          layout: { ...get().layout, previewMode: mode },
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Add activity to the list
      addActivity: (activity) => {
        const { activities, maxActivities } = get();
        // Keep only the last maxActivities items
        const newActivities = [...activities, activity].slice(-maxActivities);
        set({ activities: newActivities });
      },

      // Clear all activities
      clearActivities: () => {
        set({ activities: [] });
      },

      // Toggle activity drawer
      toggleActivityDrawer: () => {
        set({ activityDrawerOpen: !get().activityDrawerOpen });
      },

      // Set activity drawer open state
      setActivityDrawerOpen: (open) => {
        set({ activityDrawerOpen: open });
      },

      // Reset store
      reset: () => {
        const { eventSource } = get();
        if (eventSource) {
          eventSource.close();
        }
        set({
          ...initialState,
          eventSource: null,
          activities: [],
          activityDrawerOpen: false,
        });
      },
    }),
    { name: 'planning-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const useCurrentBatchQuestions = () => {
  return usePlanningStore((state) => state.currentBatch?.questions ?? []);
};

export const usePlanningProgress = () => {
  const phaseProgress = usePlanningStore((state) => state.phaseProgress);
  const currentPhase = usePlanningStore((state) => state.currentPhase);

  const phases: PlanningPhase[] = ['requirements', 'clarify', 'technical'];
  const currentIndex = phases.indexOf(currentPhase);

  return {
    currentPhase,
    currentIndex,
    phases,
    phaseProgress,
    totalPhases: phases.length,
    completedPhases: phases.filter((p) => phaseProgress[p].completed).length,
  };
};

export const useArtifactCounts = () => {
  const artifacts = usePlanningStore((state) => state.artifacts);
  return {
    diagrams: artifacts.diagrams.length,
    tasks: artifacts.tasks.length,
    uiMockups: artifacts.uiMockups.length,
    apiSpecs: artifacts.apiSpecs.length,
    total:
      artifacts.diagrams.length +
      artifacts.tasks.length +
      artifacts.uiMockups.length +
      artifacts.apiSpecs.length,
  };
};

// Activity selectors
export const useActivities = () => {
  return usePlanningStore((state) => state.activities);
};

export const useActivityDrawerOpen = () => {
  return usePlanningStore((state) => state.activityDrawerOpen);
};

export const useActivityCounts = () => {
  const activities = usePlanningStore((state) => state.activities);
  return {
    total: activities.length,
    tools: activities.filter((a) => a.activityType === 'tool_start').length,
    errors: activities.filter((a) => a.activityType === 'error').length,
  };
};

export const useLatestActivity = () => {
  const activities = usePlanningStore((state) => state.activities);
  return activities[activities.length - 1] ?? null;
};
