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

export interface BoardApiResponse {
  project: {
    id: string;
    name: string;
    description: string | null;
    lastSyncedAt: string | null;
  };
  statuses: string[];
  issues: Record<string, Array<{
    id: string;
    githubIssueId: string;
    owner: string;
    repo: string;
    issueNumber: number;
    title: string;
    body: string;
    state: 'OPEN' | 'CLOSED';
    labels: { name: string; color: string }[];
    assignees: string[];
    hasPlan: boolean;
    lastExecutionStatus?: string;
  }>>;
  repos: Array<{ id: string; owner: string; repo: string }>;
  lastSyncedAt: string | null;
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

// Helper to get color for status
function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('done') || statusLower.includes('complete')) return '22c55e';
  if (statusLower.includes('progress') || statusLower.includes('doing')) return '3b82f6';
  if (statusLower.includes('review')) return 'a855f7';
  if (statusLower.includes('blocked')) return 'ef4444';
  if (statusLower.includes('backlog') || statusLower.includes('todo')) return '6b7280';
  return '6b7280';
}

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
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to fetch board');
          }

          const data = await response.json() as BoardApiResponse;

          // Convert statuses to columns
          const columns: KanbanColumn[] = data.statuses.map((status, index) => ({
            id: status.toLowerCase().replace(/\s+/g, '-'),
            name: status,
            color: getStatusColor(status),
            position: index,
          }));

          // Flatten issues from grouped object to array
          const issues: KanbanIssue[] = [];
          const repoSet = new Set<string>();

          for (const [status, statusIssues] of Object.entries(data.issues)) {
            for (const issue of statusIssues) {
              issues.push({
                id: issue.id,
                githubIssueId: issue.githubIssueId,
                number: issue.issueNumber,
                title: issue.title,
                body: issue.body,
                status,
                owner: issue.owner,
                repo: issue.repo,
                labels: issue.labels,
                assignees: issue.assignees,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              repoSet.add(`${issue.owner}/${issue.repo}`);
            }
          }

          set({
            columns,
            issues,
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
        if (projectId === null || projectId === undefined || projectId === '') return;

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
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to move issue');
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
            const data = await response.json() as { error?: string };
            throw new Error(data.error ?? 'Failed to sync');
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
