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
  githubToken: string;
  githubProjectOwner: string;
  githubProjectNumber: number;
  syncIntervalMinutes?: number | undefined;
  repos?: { owner: string; repo: string }[] | undefined;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
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
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch projects');
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
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch project');
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

        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to create project');
          }

          const project = await response.json() as Project;

          // Add repos if provided
          if (data.repos && data.repos.length > 0) {
            for (const repo of data.repos) {
              await fetch(`/api/projects/${project.id}/repos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(repo),
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
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create project',
            isLoading: false,
          });
          throw error;
        }
      },

      // Update project
      updateProject: async (id: string, data: UpdateProjectData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to update project');
          }

          const project = await response.json() as Project;

          set((state) => ({
            projects: state.projects.map((p) => (p.id === id ? project : p)),
            currentProject: state.currentProject?.id === id ? project : state.currentProject,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update project',
            isLoading: false,
          });
          throw error;
        }
      },

      // Delete project
      deleteProject: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete project');
          }

          set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
            currentProject: state.currentProject?.id === id ? null : state.currentProject,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete project',
            isLoading: false,
          });
          throw error;
        }
      },

      // Add repository
      addRepo: async (projectId: string, owner: string, repo: string) => {
        set({ error: null });

        try {
          const response = await fetch(`/api/projects/${projectId}/repos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo }),
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to add repository');
          }

          // Refresh project to get updated repos
          const { fetchProject } = get();
          await fetchProject(projectId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add repository',
          });
          throw error;
        }
      },

      // Remove repository
      removeRepo: async (projectId: string, repoId: string) => {
        set({ error: null });

        try {
          const response = await fetch(`/api/projects/${projectId}/repos/${repoId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to remove repository');
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
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to remove repository',
          });
          throw error;
        }
      },

      // Sync project with GitHub
      syncProject: async (id: string) => {
        set({ isSyncing: true, error: null });

        try {
          const response = await fetch(`/api/projects/${id}/sync`, {
            method: 'POST',
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to sync project');
          }

          // Refresh project
          const { fetchProject } = get();
          await fetchProject(id);

          set({ isSyncing: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to sync project',
            isSyncing: false,
          });
          throw error;
        }
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
