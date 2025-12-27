/**
 * Single Project API
 *
 * GET /api/projects/:id - Get project by ID
 *
 * Note: Mutations (PUT/DELETE) are handled via Server Actions
 * @see src/lib/actions/projects.ts
 */

import { NextResponse } from 'next/server';
import {
  getProject,
  getProjectRepos,
} from '@/lib/db/repositories/project.repository';
import { validateUuid } from '@/lib/validation';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const logger = createLogger({ route: 'GET /api/projects/:id' });

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
    logger.error('Failed to get project', { error: error });
    return NextResponse.json({ error: 'Failed to get project' }, { status: 500 });
  }
}
