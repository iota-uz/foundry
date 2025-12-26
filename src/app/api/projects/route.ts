/**
 * Projects API
 *
 * GET /api/projects - List all projects
 *
 * Note: Mutations (POST) are handled via Server Actions
 * @see src/lib/actions/projects.ts
 */

import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/db/repositories/project.repository';

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
