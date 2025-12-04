/**
 * Project state management with Zustand
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'react-hot-toast';
import type {
  Project,
  Module,
  Feature,
  Constitution,
} from '@/types';

interface ProjectStore {
  // State
  project: Project | null;
  modules: Module[];
  features: Feature[];
  selectedFeatureId: string | null;
  constitution: Constitution | null;
  loading: boolean;
  error: string | null;

  // Project actions
  loadProject: (path: string) => Promise<void>;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  clearProject: () => void;

  // Module actions
  createModule: (name: string, description: string) => Promise<Module>;
  updateModule: (id: string, updates: Partial<Module>) => Promise<Module>;
  deleteModule: (id: string) => Promise<void>;

  // Feature actions
  createFeature: (moduleId: string, name: string, description: string) => Promise<Feature>;
  updateFeature: (id: string, updates: Partial<Feature>) => Promise<Feature>;
  deleteFeature: (id: string) => Promise<void>;
  selectFeature: (id: string | null) => void;

  // Constitution actions
  loadConstitution: () => Promise<void>;
  updateConstitution: (constitution: Constitution) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      project: null,
      modules: [],
      features: [],
      selectedFeatureId: null,
      constitution: null,
      loading: false,
      error: null,

      // Project actions
      loadProject: async (path: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/projects?path=${encodeURIComponent(path)}`);
          if (!response.ok) {
            throw new Error('Failed to load project');
          }
          const data = await response.json();
          set({
            project: data.project,
            modules: data.modules || [],
            features: data.features || [],
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      updateProject: async (updates: Partial<Project>) => {
        const { project } = get();
        if (!project) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${project.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error('Failed to update project');
          }

          const updatedProject = await response.json();
          set({ project: updatedProject, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      clearProject: () => {
        set({
          project: null,
          modules: [],
          features: [],
          selectedFeatureId: null,
          constitution: null,
        });
      },

      // Module actions
      createModule: async (name: string, description: string) => {
        const { project } = get();
        if (!project?.path) throw new Error('No project loaded');

        set({ loading: true, error: null });
        try {
          const response = await fetch(
            `/api/modules?projectPath=${encodeURIComponent(project.path)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, description }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create module');
          }

          const { module } = await response.json();
          set((state) => ({
            modules: [...state.modules, module],
            loading: false,
          }));

          toast.success(`Module "${name}" created`);
          return module;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message, loading: false });
          toast.error(message);
          throw error;
        }
      },

      updateModule: async (id: string, updates: Partial<Module>) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/modules/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error('Failed to update module');
          }

          const updatedModule = await response.json();
          set((state) => ({
            modules: state.modules.map((m) => (m.id === id ? updatedModule : m)),
            loading: false,
          }));

          return updatedModule;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
          throw error;
        }
      },

      deleteModule: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/modules/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete module');
          }

          set((state) => ({
            modules: state.modules.filter((m) => m.id !== id),
            features: state.features.filter((f) => f.moduleId !== id),
            loading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
          throw error;
        }
      },

      // Feature actions
      createFeature: async (moduleSlug: string, name: string, description: string) => {
        const { project } = get();
        if (!project?.path) throw new Error('No project loaded');

        set({ loading: true, error: null });
        try {
          const response = await fetch(
            `/api/features?projectPath=${encodeURIComponent(project.path)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                moduleId: moduleSlug, // API expects 'moduleId' but treats as slug
                name,
                description,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create feature');
          }

          const feature = await response.json();
          set((state) => ({
            features: [...state.features, feature],
            loading: false,
          }));

          toast.success(`Feature "${name}" created`);
          return feature;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message, loading: false });
          toast.error(message);
          throw error;
        }
      },

      updateFeature: async (id: string, updates: Partial<Feature>) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/features/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error('Failed to update feature');
          }

          const updatedFeature = await response.json();
          set((state) => ({
            features: state.features.map((f) => (f.id === id ? updatedFeature : f)),
            loading: false,
          }));

          return updatedFeature;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
          throw error;
        }
      },

      deleteFeature: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/features/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete feature');
          }

          set((state) => ({
            features: state.features.filter((f) => f.id !== id),
            selectedFeatureId: state.selectedFeatureId === id ? null : state.selectedFeatureId,
            loading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
          throw error;
        }
      },

      selectFeature: (id: string | null) => {
        set({ selectedFeatureId: id });
      },

      // Constitution actions
      loadConstitution: async () => {
        const { project } = get();
        if (!project) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/constitution?projectId=${project.id}`);
          if (!response.ok) {
            throw new Error('Failed to load constitution');
          }
          const constitution = await response.json();
          set({ constitution, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      updateConstitution: async (constitution: Constitution) => {
        const { project } = get();
        if (!project) return;

        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/constitution', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              ...constitution,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update constitution');
          }

          const updatedConstitution = await response.json();
          set({ constitution: updatedConstitution, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },
    }),
    { name: 'project-store' }
  )
);
