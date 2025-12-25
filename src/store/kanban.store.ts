/**
 * Kanban Store
 *
 * Manages Kanban board state for GitHub-synced project boards.
 * Features:
 * - Column and issue management
 * - Drag-and-drop state coordination
 * - Repository filtering
 * - Optimistic updates for issue moves
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface IssueLabel {
  name: string;
  color: string;
}

export interface KanbanIssue {
  id: string;
  githubIssueId: string;
  number: number;
  title: string;
  body: string | null;
  status: string;
  owner: string;
  repo: string;
  labels: IssueLabel[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface BoardData {
  columns: KanbanColumn[];
  issues: KanbanIssue[];
  project: {
    id: string;
    name: string;
    lastSyncedAt: string | null;
  };
}

// ============================================================================
// Store State & Actions
// ============================================================================

interface KanbanState {
  // Data
  columns: KanbanColumn[];
  issues: KanbanIssue[];
  projectId: string | null;
  projectName: string;
  lastSyncedAt: string | null;

  // Filters
  selectedRepos: string[];
  availableRepos: string[];

  // Drag state
  activeIssueId: string | null;
  overColumnId: string | null;

  // Selection state
  selectedIssueId: string | null;

  // UI State
  isLoading: boolean;
  isSyncing: boolean;
  isMoving: boolean;
  error: string | null;

  // Actions
  fetchBoard: (projectId: string) => Promise<void>;
  moveIssue: (issueId: string, toStatus: string) => Promise<void>;
  syncBoard: (projectId: string) => Promise<void>;
  setRepoFilter: (repos: string[]) => void;
  setActiveIssue: (issueId: string | null) => void;
  setOverColumn: (columnId: string | null) => void;
  setSelectedIssue: (issueId: string | null) => void;
  getIssueById: (issueId: string) => KanbanIssue | undefined;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

const initialState = {
  columns: [],
  issues: [],
  projectId: null,
  projectName: '',
  lastSyncedAt: null,
  selectedRepos: [],
  availableRepos: [],
  activeIssueId: null,
  overColumnId: null,
  selectedIssueId: null,
  isLoading: false,
  isSyncing: false,
  isMoving: false,
  error: null,
};

export const useKanbanStore = create<KanbanState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Fetch board data
      fetchBoard: async (projectId: string) => {
        set({ isLoading: true, error: null, projectId });

        try {
          const response = await fetch(`/api/projects/${projectId}/board`);
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch board');
          }

          const { data } = await response.json() as { data: BoardData };

          // Extract unique repos from issues
          const repoSet = new Set<string>();
          data.issues.forEach((issue) => {
            repoSet.add(`${issue.owner}/${issue.repo}`);
          });

          set({
            columns: data.columns.sort((a, b) => a.position - b.position),
            issues: data.issues,
            projectName: data.project.name,
            lastSyncedAt: data.project.lastSyncedAt,
            availableRepos: Array.from(repoSet).sort(),
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch board',
            isLoading: false,
          });
        }
      },

      // Move issue to new status
      moveIssue: async (issueId: string, toStatus: string) => {
        const { projectId, issues } = get();
        if (!projectId) return;

        const issue = issues.find((i) => i.id === issueId);
        if (!issue || issue.status === toStatus) return;

        const previousStatus = issue.status;

        // Optimistic update
        set({
          isMoving: true,
          issues: issues.map((i) =>
            i.id === issueId ? { ...i, status: toStatus } : i
          ),
        });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/issues/${issueId}/status`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: toStatus }),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to move issue');
          }

          set({ isMoving: false });
        } catch (error) {
          // Rollback on failure
          set({
            issues: issues.map((i) =>
              i.id === issueId ? { ...i, status: previousStatus } : i
            ),
            error: error instanceof Error ? error.message : 'Failed to move issue',
            isMoving: false,
          });
        }
      },

      // Sync board with GitHub
      syncBoard: async (projectId: string) => {
        set({ isSyncing: true, error: null });

        try {
          const response = await fetch(`/api/projects/${projectId}/sync`, {
            method: 'POST',
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to sync');
          }

          // Refresh board data
          await get().fetchBoard(projectId);
          set({ isSyncing: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to sync',
            isSyncing: false,
          });
        }
      },

      // Set repo filter
      setRepoFilter: (repos: string[]) => {
        set({ selectedRepos: repos });
      },

      // Drag state
      setActiveIssue: (issueId: string | null) => {
        set({ activeIssueId: issueId });
      },

      setOverColumn: (columnId: string | null) => {
        set({ overColumnId: columnId });
      },

      // Selected issue for detail panel
      setSelectedIssue: (issueId: string | null) => {
        set({ selectedIssueId: issueId });
      },

      // Get issue by ID
      getIssueById: (issueId: string) => {
        return get().issues.find((i) => i.id === issueId);
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
    { name: 'kanban-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const useFilteredIssues = () => {
  const issues = useKanbanStore((state) => state.issues);
  const selectedRepos = useKanbanStore((state) => state.selectedRepos);

  if (selectedRepos.length === 0) {
    return issues;
  }

  return issues.filter((issue) =>
    selectedRepos.includes(`${issue.owner}/${issue.repo}`)
  );
};
