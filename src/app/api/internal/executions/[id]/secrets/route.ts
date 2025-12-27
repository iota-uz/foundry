/**
 * Internal API: Secrets Download
 *
 * Returns decrypted workflow secrets for container execution.
 * Includes project's GitHub token when triggered by automation.
 * GET /api/internal/executions/:id/secrets
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { getExecution } from '@/lib/db/repositories/workflow.repository';
import { getDecryptedSecrets } from '@/lib/db/repositories/workflow-secrets.repository';
import {
  getByWorkflowExecutionId,
  getIssueMetadata,
} from '@/lib/db/repositories/issue-metadata.repository';
import { getProject } from '@/lib/db/repositories/project.repository';
import { getWithDecryptedToken } from '@/lib/db/repositories/github-credential.repository';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const logger = createLogger({ route: 'GET /api/internal/executions/:id/secrets' });

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    await requireValidToken(authHeader, id);

    // Get execution
    const execution = await getExecution(id);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Get decrypted secrets for the workflow
    const secrets = await getDecryptedSecrets(execution.workflowId);

    // Check if this execution was triggered by an issue automation
    // If so, inject the project's GitHub token for git operations
    const issueExecution = await getByWorkflowExecutionId(id);
    if (issueExecution) {
      const issueMeta = await getIssueMetadata(issueExecution.issueMetadataId);
      if (issueMeta) {
        const project = await getProject(issueMeta.projectId);
        if (project?.githubCredentialId) {
          // Get decrypted GitHub token from project's credential
          const credential = await getWithDecryptedToken(project.githubCredentialId);
          if (credential) {
            secrets.GITHUB_TOKEN = credential.token;
          }
        }
      }
    }

    // Return secrets as key-value pairs
    return NextResponse.json(secrets);
  } catch (error) {
    logger.error('Failed to get execution secrets', { error: error });

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
