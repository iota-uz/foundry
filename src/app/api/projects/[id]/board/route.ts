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
import { githubCache, CACHE_TTL, CacheKeys } from '@/lib/cache';
import type { ProjectItemWithFields, ProjectsConfig, ProjectValidation } from '@/lib/github-projects/types';
import type { PlanContent } from '@/lib/planning/types';
import type { IssuePlanStatus } from '@/store/kanban.store';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const logger = createLogger({ route: 'GET /api/projects/:id/board' });

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

      // Cache project validation
      const validationCacheKey = CacheKeys.projectValidation(
        project.githubProjectOwner,
        project.githubProjectNumber
      );
      let validation = githubCache.get<ProjectValidation>(validationCacheKey);

      if (!validation) {
        validation = await client.validate();
        if (validation.valid) {
          githubCache.set(validationCacheKey, validation, CACHE_TTL.PROJECT_VALIDATION);
        }
      }

      if (!validation.valid) {
        logger.warn('GitHub project validation failed', { errors: validation.errors });
      }

      // Get statuses from validation
      statuses = validation.statusOptions?.map((opt: { name: string }) => opt.name) ?? [];

      // Fetch all items from all statuses with caching
      for (const status of statuses) {
        const itemsCacheKey = CacheKeys.projectItems(
          project.githubProjectOwner,
          project.githubProjectNumber,
          status
        );

        let items = githubCache.get<ProjectItemWithFields[]>(itemsCacheKey);

        if (!items) {
          items = await client.fetchItemsByStatus({ status });
          // Only cache successful responses
          if (items) {
            githubCache.set(itemsCacheKey, items, CACHE_TTL.PROJECT_ITEMS);
          }
        }

        for (const item of items ?? []) {
          if (item.content) {
            // Key by owner/repo/number for lookup
            const key = `${item.content.repository.owner.login}/${item.content.repository.name}#${item.content.number}`;
            githubIssueMap.set(key, item);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch GitHub issue data, using metadata only', {
        error: error instanceof Error ? error.message : String(error),
      });
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
    logger.error('Failed to get board data', { error: error });
    return NextResponse.json(
      { error: 'Failed to get board data' },
      { status: 500 }
    );
  }
}
