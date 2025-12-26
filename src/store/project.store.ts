/**
 * Project Store
 *
 * Manages project state for the GitHub-synced Kanban board.
 * Features:
 * - Project CRUD operations
 * - Repository linking/unlinking
 * - GitHub sync state
 * - Loading and error states
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  syncProjectAction,
} from '@/lib/actions/projects';
import { addRepoAction, removeRepoAction } from '@/lib/actions/repos';

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

export interface ProjectRepo {
  id: string;
  projectId: string;
  owner: string;
  repo: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  githubProjectOwner: string;
  githubProjectNumber: number;
  syncIntervalMinutes: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  repos?: ProjectRepo[];
}

export interface CreateProjectData {
  name: string;
  description?: string | undefined;
  githubCredentialId?: string | null | undefined;
  githubToken?: string | undefined;
  githubProjectOwner: string;
  githubProjectNumber: number;
  syncIntervalMinutes?: number | undefined;
  repos?: { owner: string; repo: string }[] | undefined;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  githubCredentialId?: string | null;
  githubToken?: string;
  githubProjectOwner?: string;
  githubProjectNumber?: number;
  syncIntervalMinutes?: number;
}

// ============================================================================
// Store State & Actions
// ============================================================================

interface ProjectState {
  // Data
  projects: Project[];
  currentProject: Project | null;

  // UI State
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectData) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Repository actions
  addRepo: (projectId: string, owner: string, repo: string) => Promise<void>;
  removeRepo: (projectId: string, repoId: string) => Promise<void>;

  // Sync actions
  syncProject: (id: string) => Promise<void>;

  // Utilities
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProject: null,
      isLoading: false,
      isSyncing: false,
      error: null,

      // Fetch all projects
      fetchProjects: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/projects');
          if (!response.ok) {
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to fetch projects');
          }

          const { projects } = await response.json() as { projects: Project[] };
          set({ projects: projects ?? [], isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch projects',
            isLoading: false,
          });
        }
      },

      // Fetch single project with repos
      fetchProject: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/projects/${id}`);
          if (!response.ok) {
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to fetch project');
          }

          const project = await response.json() as Project;
          set({ currentProject: project, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch project',
            isLoading: false,
          });
        }
      },

      // Create new project
      createProject: async (data: CreateProjectData) => {
        set({ isLoading: true, error: null });

        const result = await createProjectAction({
          name: data.name,
          description: data.description,
          githubCredentialId: data.githubCredentialId ?? undefined,
          githubToken: data.githubToken,
          githubProjectOwner: data.githubProjectOwner,
          githubProjectNumber: data.githubProjectNumber,
          syncIntervalMinutes: data.syncIntervalMinutes,
        });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isLoading: false });
          throw new Error(error);
        }

        if (result.data === undefined) {
          const errMsg = 'Unexpected error: no data returned';
          set({ error: errMsg, isLoading: false });
          throw new Error(errMsg);
        }

        const project = result.data.project as unknown as Project;

        // Add repos if provided
        if (data.repos !== undefined && data.repos.length > 0) {
          for (const repo of data.repos) {
            await addRepoAction({
              projectId: project.id,
              owner: repo.owner,
              repo: repo.repo,
            });
          }
        }

        // Refresh project with repos
        const refreshResponse = await fetch(`/api/projects/${project.id}`);
        const refreshedProject = await refreshResponse.json() as Project;

        set((state) => ({
          projects: [...state.projects, refreshedProject],
          currentProject: refreshedProject,
          isLoading: false,
        }));

        return refreshedProject;
      },

      // Update project
      updateProject: async (id: string, data: UpdateProjectData) => {
        set({ isLoading: true, error: null });

        const result = await updateProjectAction({ id, ...data });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isLoading: false });
          throw new Error(error);
        }

        if (result.data === undefined) {
          const errMsg = 'Unexpected error: no data returned';
          set({ error: errMsg, isLoading: false });
          throw new Error(errMsg);
        }

        const project = result.data.project as unknown as Project;

        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? project : p)),
          currentProject: state.currentProject?.id === id ? project : state.currentProject,
          isLoading: false,
        }));
      },

      // Delete project
      deleteProject: async (id: string) => {
        set({ isLoading: true, error: null });

        const result = await deleteProjectAction({ id });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isLoading: false });
          throw new Error(error);
        }

        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
          isLoading: false,
        }));
      },

      // Add repository
      addRepo: async (projectId: string, owner: string, repo: string) => {
        set({ error: null });

        const result = await addRepoAction({ projectId, owner, repo });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error });
          throw new Error(error);
        }

        // Refresh project to get updated repos
        const { fetchProject } = get();
        await fetchProject(projectId);
      },

      // Remove repository
      removeRepo: async (projectId: string, repoId: string) => {
        set({ error: null });

        const result = await removeRepoAction({ projectId, repoId });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error });
          throw new Error(error);
        }

        // Update current project repos
        set((state) => {
          if (!state.currentProject) return {};
          return {
            currentProject: {
              ...state.currentProject,
              repos: (state.currentProject.repos ?? []).filter((r) => r.id !== repoId),
            },
          };
        });
      },

      // Sync project with GitHub
      syncProject: async (id: string) => {
        set({ isSyncing: true, error: null });

        const result = await syncProjectAction({ id });

        const error = extractActionError(result);
        if (error !== null) {
          set({ error, isSyncing: false });
          throw new Error(error);
        }

        // Refresh project
        const { fetchProject } = get();
        await fetchProject(id);

        set({ isSyncing: false });
      },

      // Set current project
      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'project-store' }
  )
);
