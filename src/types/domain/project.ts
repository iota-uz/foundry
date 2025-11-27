/**
 * Project-level types
 */

/**
 * Project metadata and settings
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  mode: ProjectMode;
  phase: ProjectPhase;
  version: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Project creation mode
 */
export type ProjectMode = 'new' | 'reverse_engineered';

/**
 * Current workflow phase
 */
export type ProjectPhase = 'cpo' | 'clarify' | 'cto' | 'complete';

/**
 * Project configuration settings
 */
export interface ProjectSettings {
  defaultBranch: string;
  autoSave: boolean;
  autoCommit: boolean;
}
