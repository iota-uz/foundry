/**
 * Projects API
 *
 * GET /api/projects - List all projects
 * POST /api/projects - Create a new project
 */

import { NextResponse } from 'next/server';
import {
  listProjects,
  createProject,
} from '@/lib/db/repositories/project.repository';
import {
  validateBody,
  isValidationError,
  createProjectSchema,
} from '@/lib/validation';
import { createSyncEngine } from '@/lib/projects';

/**
 * List all projects (excludes GitHub tokens)
 */
export async function GET() {
  try {
    const projects = await listProjects();

    // Exclude tokens from response
    const safeProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      githubProjectOwner: project.githubProjectOwner,
      githubProjectNumber: project.githubProjectNumber,
      syncIntervalMinutes: project.syncIntervalMinutes ?? 5,
      lastSyncedAt: project.lastSyncedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));

    return NextResponse.json({ projects: safeProjects });
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

/**
 * Create a new project with GitHub validation
 */
export async function POST(request: Request) {
  try {
    const result = await validateBody(request, createProjectSchema);
    if (isValidationError(result)) {
      return result;
    }

    // Validate GitHub connection before creating project
    const syncEngine = createSyncEngine();
    const validation = await syncEngine.validateProject({
      id: '', // Not needed for validation
      githubToken: result.githubToken,
      githubProjectOwner: result.githubProjectOwner,
      githubProjectNumber: result.githubProjectNumber,
      name: result.name,
      description: result.description ?? null,
      syncIntervalMinutes: result.syncIntervalMinutes,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'GitHub project validation failed',
          details: validation.errors.map((err) => ({
            path: 'github',
            message: err,
          })),
        },
        { status: 400 }
      );
    }

    // Create project
    const project = await createProject({
      name: result.name,
      description: result.description ?? null,
      githubToken: result.githubToken,
      githubProjectOwner: result.githubProjectOwner,
      githubProjectNumber: result.githubProjectNumber,
      syncIntervalMinutes: result.syncIntervalMinutes ?? 5,
    });

    // Return project without token
    const safeProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      githubProjectOwner: project.githubProjectOwner,
      githubProjectNumber: project.githubProjectNumber,
      syncIntervalMinutes: project.syncIntervalMinutes ?? 5,
      lastSyncedAt: project.lastSyncedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return NextResponse.json(safeProject, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
