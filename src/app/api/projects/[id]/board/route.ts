/**
 * Kanban Board API
 *
 * GET /api/projects/:id/board - Get Kanban board data
 */

import { NextResponse } from 'next/server';
import { getProject, getProjectRepos } from '@/lib/db/repositories/project.repository';
import { listIssueMetadata, getLatestExecution } from '@/lib/db/repositories/issue-metadata.repository';
import { validateUuid } from '@/lib/validation';
import { createSyncEngine } from '@/lib/projects';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get Kanban board data for a project
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

    // Get all issue metadata for this project
    const issueMetadata = await listIssueMetadata(validId);

    // Get GitHub Project status options
    const syncEngine = createSyncEngine();
    const validation = await syncEngine.validateProject(project);

    const statuses = validation.statusOptions ?? [];

    // Group issues by status
    const issuesByStatus: Record<string, Array<{
      id: string;
      githubIssueId: string;
      owner: string;
      repo: string;
      issueNumber: number;
      title: string;
      body: string;
      state: 'OPEN' | 'CLOSED';
      labels: string[];
      assignees: string[];
      hasPlan: boolean;
      lastExecutionStatus?: string;
    }>> = {};

    // Initialize with all statuses
    for (const status of statuses) {
      issuesByStatus[status] = [];
    }

    // Add issues to their status columns
    for (const metadata of issueMetadata) {
      const status = metadata.currentStatus ?? 'No Status';

      if (!issuesByStatus[status]) {
        issuesByStatus[status] = [];
      }

      // Get latest execution for this issue
      const latestExecution = await getLatestExecution(metadata.id);

      // TODO: Fetch actual issue data from GitHub (title, body, state, labels, assignees)
      // For now, we'll use placeholder data since we don't have GitHub issue fetch in ProjectsClient
      const issue = {
        id: metadata.id,
        githubIssueId: metadata.githubIssueId,
        owner: metadata.owner,
        repo: metadata.repo,
        issueNumber: metadata.issueNumber,
        title: `Issue #${metadata.issueNumber}`, // Placeholder
        body: '', // Placeholder
        state: 'OPEN' as const, // Placeholder
        labels: [] as string[], // Placeholder
        assignees: [] as string[], // Placeholder
        hasPlan: metadata.planContent !== null,
        ...(latestExecution?.result && { lastExecutionStatus: latestExecution.result }),
      };

      issuesByStatus[status].push(issue);
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        lastSyncedAt: project.lastSyncedAt,
      },
      statuses,
      issues: issuesByStatus,
      repos: repos.map((repo) => ({
        id: repo.id,
        owner: repo.owner,
        repo: repo.repo,
      })),
      lastSyncedAt: project.lastSyncedAt,
    });
  } catch (error) {
    console.error('Failed to get board data:', error);
    return NextResponse.json(
      { error: 'Failed to get board data' },
      { status: 500 }
    );
  }
}
