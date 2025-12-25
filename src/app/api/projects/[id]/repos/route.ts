/**
 * Project Repositories API
 *
 * GET /api/projects/:id/repos - List repositories
 * POST /api/projects/:id/repos - Add repository
 */

import { NextResponse } from 'next/server';
import {
  getProject,
  getProjectRepos,
  addRepo,
  isRepoLinked,
} from '@/lib/db/repositories/project.repository';
import {
  validateBody,
  isValidationError,
  validateUuid,
  addRepoSchema,
} from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * List repositories for a project
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

    return NextResponse.json({ repos });
  } catch (error) {
    console.error('Failed to list repositories:', error);
    return NextResponse.json(
      { error: 'Failed to list repositories' },
      { status: 500 }
    );
  }
}

/**
 * Add repository to a project
 */
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const result = await validateBody(request, addRepoSchema);
    if (isValidationError(result)) {
      return result;
    }

    const project = await getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if repository is already linked
    const alreadyLinked = await isRepoLinked(validId, result.owner, result.repo);
    if (alreadyLinked) {
      return NextResponse.json(
        { error: 'Repository already linked to this project' },
        { status: 400 }
      );
    }

    // Add repository
    const repo = await addRepo(validId, result.owner, result.repo);

    return NextResponse.json(repo, { status: 201 });
  } catch (error) {
    console.error('Failed to add repository:', error);
    return NextResponse.json(
      { error: 'Failed to add repository' },
      { status: 500 }
    );
  }
}
