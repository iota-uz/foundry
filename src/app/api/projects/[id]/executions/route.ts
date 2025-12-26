/**
 * Project Executions API
 *
 * GET /api/projects/:id/executions - List recent executions for a project
 */

import { NextResponse } from 'next/server';
import { ProjectRepository, IssueMetadataRepository } from '@/lib/db/repositories';
import { validateUuid } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * List recent executions for a project
 *
 * Query params:
 * - limit: number (default 50, max 100)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    // Check if project exists
    const project = await ProjectRepository.getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse query params
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam !== null && limitParam !== ''
      ? Math.min(parseInt(limitParam, 10), 100)
      : 50;

    // Get recent executions
    const executions = await IssueMetadataRepository.getRecentExecutions(validId, limit);

    return NextResponse.json({ data: executions });
  } catch (error) {
    console.error('Failed to list executions:', error);
    return NextResponse.json(
      { error: 'Failed to list executions' },
      { status: 500 }
    );
  }
}
