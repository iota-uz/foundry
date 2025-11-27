/**
 * UI state management with Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type ActiveView = 'dashboard' | 'modules' | 'features' | 'visualizations' | 'settings';

interface UIStore {
  // State
  sidebarCollapsed: boolean;
  activeView: ActiveView;
  commandPaletteOpen: boolean;
  modals: Record<string, boolean>;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveView: (view: ActiveView) => void;
  toggleCommandPalette: () => void;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        sidebarCollapsed: false,
        activeView: 'dashboard',
        commandPaletteOpen: false,
        modals: {},

        // Actions
        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set({ sidebarCollapsed: collapsed });
        },

        setActiveView: (view: ActiveView) => {
          set({ activeView: view });
        },

        toggleCommandPalette: () => {
          set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }));
        },

        openModal: (id: string) => {
          set((state) => ({
            modals: { ...state.modals, [id]: true },
          }));
        },

        closeModal: (id: string) => {
          set((state) => ({
            modals: { ...state.modals, [id]: false },
          }));
        },

        closeAllModals: () => {
          set({ modals: {} });
        },
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          activeView: state.activeView,
        }),
      }
    ),
    { name: 'ui-store' }
  )
);
