/**
 * Kanban Board API
 *
 * GET /api/projects/:id/board - Get Kanban board data
 */

import { NextResponse } from 'next/server';
import { getProject, getProjectRepos } from '@/lib/db/repositories/project.repository';
import { listIssueMetadata, getLatestExecution } from '@/lib/db/repositories/issue-metadata.repository';
import { validateUuid } from '@/lib/validation';
import { createProjectsClient } from '@/lib/github-projects/client';
import { resolveProjectToken } from '@/lib/github';
import type { ProjectItemWithFields, ProjectsConfig } from '@/lib/github-projects/types';
import type { PlanContent } from '@/lib/planning/types';
import type { IssuePlanStatus } from '@/store/kanban.store';

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

    // Resolve token and create GitHub Projects client
    let statuses: string[] = [];
    const githubIssueMap = new Map<string, ProjectItemWithFields>();

    try {
      const token = await resolveProjectToken(project);
      const config: ProjectsConfig = {
        token,
        projectOwner: project.githubProjectOwner,
        projectNumber: project.githubProjectNumber,
        verbose: false,
      };

      const client = createProjectsClient(config);
      const validation = await client.validate();

      if (!validation.valid) {
        console.warn('GitHub project validation failed:', validation.errors);
      }

      // Get statuses from validation
      statuses = validation.statusOptions?.map((opt) => opt.name) ?? [];

      // Fetch all items from all statuses
      for (const status of statuses) {
        const items = await client.fetchItemsByStatus({ status });
        for (const item of items) {
          if (item.content) {
            // Key by owner/repo/number for lookup
            const key = `${item.content.repository.owner.login}/${item.content.repository.name}#${item.content.number}`;
            githubIssueMap.set(key, item);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch GitHub issue data, using metadata only:', error);
    }

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
      labels: { name: string; color: string }[];
      assignees: string[];
      hasPlan: boolean;
      planStatus: IssuePlanStatus;
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

      // Look up actual GitHub issue data
      const key = `${metadata.owner}/${metadata.repo}#${metadata.issueNumber}`;
      const githubData = githubIssueMap.get(key);
      const content = githubData?.content;

      // Determine plan status from planContent
      const hasPlan = metadata.planContent !== null;
      let planStatus: IssuePlanStatus = 'none';
      if (hasPlan && metadata.planContent) {
        const planContent = metadata.planContent as unknown as PlanContent;
        planStatus = planContent.status ?? 'none';
      }

      const issue = {
        id: metadata.id,
        githubIssueId: metadata.githubIssueId,
        owner: metadata.owner,
        repo: metadata.repo,
        issueNumber: metadata.issueNumber,
        title: content?.title ?? `Issue #${metadata.issueNumber}`,
        body: content?.body ?? '',
        state: content?.state ?? ('OPEN' as const),
        labels: content?.labels ?? [],
        assignees: content?.assignees ?? [],
        hasPlan,
        planStatus,
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
