/**
 * Planning Page
 *
 * Full-screen planning view for a specific issue.
 * Fetches issue data from GitHub via the planning store.
 */

import { notFound } from 'next/navigation';
import { PlanView } from '@/components/planning';
import * as ProjectRepository from '@/lib/db/repositories/project.repository';
import * as IssueMetadataRepository from '@/lib/db/repositories/issue-metadata.repository';
import { createProjectsClient } from '@/lib/github-projects/client';
import { resolveProjectToken } from '@/lib/github';
import type { ProjectsConfig } from '@/lib/github-projects/types';

interface PlanPageProps {
  params: Promise<{
    id: string;
    issueId: string;
  }>;
}

export default async function PlanPage({ params }: PlanPageProps) {
  const { id: projectId, issueId } = await params;

  // Check project exists
  const project = await ProjectRepository.getProject(projectId);
  if (!project) {
    notFound();
  }

  // Get issue metadata
  const issue = await IssueMetadataRepository.getIssueMetadata(issueId);
  if (!issue || issue.projectId !== projectId) {
    notFound();
  }

  // Fetch GitHub issue data if we need it
  let issueTitle = `Issue #${issue.issueNumber}`;
  let issueBody = '';

  if (project.githubProjectNumber && project.githubProjectOwner) {
    try {
      const token = await resolveProjectToken(project);
      if (token) {
        const config: ProjectsConfig = {
          token,
          projectOwner: project.githubProjectOwner,
          projectNumber: project.githubProjectNumber,
          verbose: false,
        };
        const client = createProjectsClient(config);

        // Validate the client before using it
        const validation = await client.validate();
        if (!validation.valid) {
          console.error('GitHub Projects client validation failed:', validation.errors);
          throw new Error(`GitHub Projects validation failed: ${validation.errors.join(', ')}`);
        }

        // Get GitHub issue data - fetch from all statuses
        const statuses = ['Todo', 'In Progress', 'Done', 'Backlog'];
        for (const status of statuses) {
          const items = await client.fetchItemsByStatus({ status });
          const item = items.find(
            (i) =>
              i.content?.repository?.name === issue.repo &&
              i.content?.number === issue.issueNumber
          );

          if (item?.content) {
            issueTitle = item.content.title;
            issueBody = item.content.body ?? '';
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch GitHub issue data:', error);
      // Continue with default values
    }
  }

  return (
    <PlanView
      projectId={projectId}
      issueId={issueId}
      issueTitle={issueTitle}
      issueBody={issueBody}
    />
  );
}

export const dynamic = 'force-dynamic';
