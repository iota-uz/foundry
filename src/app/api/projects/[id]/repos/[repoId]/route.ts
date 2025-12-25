/**
 * Single Repository API
 *
 * DELETE /api/projects/:id/repos/:repoId - Remove repository
 */

import { NextResponse } from 'next/server';
import {
  getProject,
  removeRepo,
} from '@/lib/db/repositories/project.repository';
import { validateUuid } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string; repoId: string }>;
}

/**
 * Remove repository from a project
 */
export async function DELETE(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { id, repoId } = await params;
    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const validRepoId = validateUuid(repoId);
    if (validRepoId instanceof NextResponse) {
      return validRepoId;
    }

    const project = await getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await removeRepo(validId, validRepoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove repository:', error);
    return NextResponse.json(
      { error: 'Failed to remove repository' },
      { status: 500 }
    );
  }
}
