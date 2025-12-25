/**
 * Project Sync API
 *
 * POST /api/projects/:id/sync - Trigger manual sync
 */

import { NextResponse } from 'next/server';
import { getProject } from '@/lib/db/repositories/project.repository';
import { validateUuid } from '@/lib/validation';
import { createSyncEngine } from '@/lib/projects';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Trigger manual sync for a project
 */
export async function POST(
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

    const syncEngine = createSyncEngine();

    // Validate project first
    const validation = await syncEngine.validateProject(project);
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

    // Perform sync
    const result = await syncEngine.syncProjectItems(validId, project);

    return NextResponse.json({
      synced: result.synced,
      added: result.added,
      updated: result.updated,
      statusChanges: result.statusChanges,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Failed to sync project:', error);
    return NextResponse.json(
      { error: 'Failed to sync project' },
      { status: 500 }
    );
  }
}
