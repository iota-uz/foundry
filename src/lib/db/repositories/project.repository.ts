/**
 * Project Repository
 *
 * Database operations for GitHub Projects V2 integration.
 * Manages projects and their linked repositories.
 */

import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../client';
import {
  projects,
  projectRepos,
  type Project,
  type NewProject,
  type ProjectRepo,
  type NewProjectRepo,
} from '../schema';

// ============================================================================
// Project CRUD
// ============================================================================

/**
 * Create a new project
 */
export async function createProject(data: NewProject): Promise<Project> {
  const db = getDatabase();
  const [project] = await db.insert(projects).values(data).returning();
  if (!project) {
    throw new Error('Failed to create project');
  }
  return project;
}

/**
 * Get a project by ID
 */
export async function getProject(id: string): Promise<Project | undefined> {
  const db = getDatabase();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project;
}

/**
 * List all projects
 */
export async function listProjects(): Promise<Project[]> {
  const db = getDatabase();
  return db.select().from(projects);
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  data: Partial<NewProject>
): Promise<Project> {
  const db = getDatabase();
  const [project] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  if (!project) {
    throw new Error('Project not found');
  }
  return project;
}

/**
 * Delete a project
 * Note: Cascades to project_repos, project_automations, issue_metadata
 */
export async function deleteProject(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(projects).where(eq(projects.id, id));
}

/**
 * Update last synced timestamp
 */
export async function updateLastSynced(id: string): Promise<Project> {
  return updateProject(id, { lastSyncedAt: new Date() });
}

// ============================================================================
// Project Repositories
// ============================================================================

/**
 * Add a repository to a project
 */
export async function addRepo(
  projectId: string,
  owner: string,
  repo: string
): Promise<ProjectRepo> {
  const db = getDatabase();
  const [projectRepo] = await db
    .insert(projectRepos)
    .values({ projectId, owner, repo })
    .returning();
  if (!projectRepo) {
    throw new Error('Failed to add repository');
  }
  return projectRepo;
}

/**
 * Remove a repository from a project
 */
export async function removeRepo(
  projectId: string,
  repoId: string
): Promise<void> {
  const db = getDatabase();
  await db
    .delete(projectRepos)
    .where(and(eq(projectRepos.projectId, projectId), eq(projectRepos.id, repoId)));
}

/**
 * Get all repositories for a project
 */
export async function getProjectRepos(projectId: string): Promise<ProjectRepo[]> {
  const db = getDatabase();
  return db
    .select()
    .from(projectRepos)
    .where(eq(projectRepos.projectId, projectId));
}

/**
 * Check if a repository is linked to a project
 */
export async function isRepoLinked(
  projectId: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db
    .select()
    .from(projectRepos)
    .where(
      and(
        eq(projectRepos.projectId, projectId),
        eq(projectRepos.owner, owner),
        eq(projectRepos.repo, repo)
      )
    )
    .limit(1);
  return !!result;
}

// ============================================================================
// Re-export types
// ============================================================================

export type { Project, NewProject, ProjectRepo, NewProjectRepo };
