/**
 * Project Router
 *
 * tRPC procedures for project management.
 * Replaces: /api/projects/* GET endpoints
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../init';
import {
  getProject,
  getProjectRepos,
  listProjects,
} from '@/lib/db/repositories/project.repository';
import { ProjectRepository, IssueMetadataRepository } from '@/lib/db/repositories';
import { listIssueMetadata, getLatestExecution } from '@/lib/db/repositories/issue-metadata.repository';
import { createProjectsClient } from '@/lib/github-projects/client';
import { resolveProjectToken } from '@/lib/github';
import { githubCache, CACHE_TTL, CacheKeys } from '@/lib/cache';
import type { ProjectItemWithFields, ProjectsConfig, ProjectValidation } from '@/lib/github-projects/types';
import type { PlanContent } from '@/lib/planning/types';
import type { IssuePlanStatus } from '@/store/kanban.store';

export const projectRouter = router({
  /**
   * List all projects
   * Replaces: GET /api/projects
   */
  list: publicProcedure.query(async () => {
    const projects = await listProjects();

    return projects.map((project) => ({
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
  }),

  /**
   * Get project by ID with repositories
   * Replaces: GET /api/projects/:id
   */
  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const project = await getProject(input.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const repos = await getProjectRepos(input.id);

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        githubProjectOwner: project.githubProjectOwner,
        githubProjectNumber: project.githubProjectNumber,
        syncIntervalMinutes: project.syncIntervalMinutes,
        lastSyncedAt: project.lastSyncedAt,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        repos: repos.map((repo) => ({
          id: repo.id,
          owner: repo.owner,
          repo: repo.repo,
        })),
      };
    }),

  /**
   * Get Kanban board data for a project
   * Replaces: GET /api/projects/:id/board
   */
  board: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const project = await getProject(input.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const repos = await getProjectRepos(input.id);
      const issueMetadata = await listIssueMetadata(input.id);

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
          console.warn('GitHub project validation failed:', validation.errors);
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
            if (items) {
              githubCache.set(itemsCacheKey, items, CACHE_TTL.PROJECT_ITEMS);
            }
          }

          for (const item of items ?? []) {
            if (item.content) {
              const key = `${item.content.repository.owner.login}/${item.content.repository.name}#${item.content.number}`;
              githubIssueMap.set(key, item);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch GitHub issue data, using metadata only:', error);
      }

      // Group issues by status
      type BoardIssue = {
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
      };

      const issuesByStatus: Record<string, BoardIssue[]> = {};

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

        const issue: BoardIssue = {
          id: metadata.id,
          githubIssueId: metadata.githubIssueId,
          owner: metadata.owner,
          repo: metadata.repo,
          issueNumber: metadata.issueNumber,
          title: content?.title ?? `Issue #${metadata.issueNumber}`,
          body: content?.body ?? '',
          state: content?.state ?? 'OPEN',
          labels: content?.labels ?? [],
          assignees: content?.assignees ?? [],
          hasPlan,
          planStatus,
          ...(latestExecution?.result && { lastExecutionStatus: latestExecution.result }),
        };

        issuesByStatus[status].push(issue);
      }

      return {
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
      };
    }),

  /**
   * List recent executions for a project
   * Replaces: GET /api/projects/:id/executions
   */
  executions: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const project = await ProjectRepository.getProject(input.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const executions = await IssueMetadataRepository.getRecentExecutions(
        input.id,
        input.limit
      );

      return executions;
    }),
});
