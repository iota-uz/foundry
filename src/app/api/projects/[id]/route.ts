/**
 * Single Project API
 *
 * GET /api/projects/:id - Get project by ID
 * PUT /api/projects/:id - Update project
 * DELETE /api/projects/:id - Delete project
 */

import { NextResponse } from 'next/server';
import {
  getProject,
  updateProject,
  deleteProject,
  getProjectRepos,
} from '@/lib/db/repositories/project.repository';
import {
  validateBody,
  isValidationError,
  validateUuid,
  updateProjectSchema,
} from '@/lib/validation';
import { createSyncEngine } from '@/lib/projects';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get project by ID with repositories
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const project = await getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const repos = await getProjectRepos(validId);

    // Exclude token from response
    const safeProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      githubProjectOwner: project.githubProjectOwner,
      githubProjectNumber: project.githubProjectNumber,
      syncIntervalMinutes: project.syncIntervalMinutes,
      lastSyncedAt: project.lastSyncedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      repos,
    };

    return NextResponse.json(safeProject);
  } catch (error) {
    console.error('Failed to get project:', error);
    return NextResponse.json({ error: 'Failed to get project' }, { status: 500 });
  }
}

/**
 * Update project
 */
export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const result = await validateBody(request, updateProjectSchema);
    if (isValidationError(result)) {
      return result;
    }

    // Check if project exists
    const existing = await getProject(validId);
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If GitHub config is being updated, validate it
    if (
      result.githubToken !== undefined ||
      result.githubProjectOwner !== undefined ||
      result.githubProjectNumber !== undefined
    ) {
      const syncEngine = createSyncEngine();
      const validation = await syncEngine.validateProject({
        id: validId,
        githubToken: result.githubToken ?? existing.githubToken,
        githubProjectOwner: result.githubProjectOwner ?? existing.githubProjectOwner,
        githubProjectNumber: result.githubProjectNumber ?? existing.githubProjectNumber,
        name: result.name ?? existing.name,
        description: result.description ?? existing.description,
        syncIntervalMinutes: result.syncIntervalMinutes ?? existing.syncIntervalMinutes,
        lastSyncedAt: existing.lastSyncedAt,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
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
    }

    // Update project - only include defined values
    const updateData: Record<string, unknown> = {};
    if (result.name !== undefined) updateData.name = result.name;
    if (result.description !== undefined) updateData.description = result.description;
    if (result.githubToken !== undefined) updateData.githubToken = result.githubToken;
    if (result.githubProjectOwner !== undefined) updateData.githubProjectOwner = result.githubProjectOwner;
    if (result.githubProjectNumber !== undefined) updateData.githubProjectNumber = result.githubProjectNumber;
    if (result.syncIntervalMinutes !== undefined) updateData.syncIntervalMinutes = result.syncIntervalMinutes;

    const project = await updateProject(validId, updateData);

    // Return project without token
    const safeProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      githubProjectOwner: project.githubProjectOwner,
      githubProjectNumber: project.githubProjectNumber,
      syncIntervalMinutes: project.syncIntervalMinutes,
      lastSyncedAt: project.lastSyncedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return NextResponse.json(safeProject);
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

/**
 * Delete project (cascades to repos, automations, issues)
 */
export async function DELETE(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const project = await getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await deleteProject(validId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
