/**
 * Internal API: Workflow Download
 *
 * Returns workflow definition for container execution.
 * Enriches context with issue info when triggered by automation.
 * GET /api/internal/executions/:id/workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { getExecution, getWorkflow } from '@/lib/db/repositories/workflow.repository';
import {
  getByWorkflowExecutionId,
  getIssueMetadata,
} from '@/lib/db/repositories/issue-metadata.repository';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const logger = createLogger({ route: 'GET /api/internal/executions/:id/workflow' });

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

    // Get workflow
    const workflow = await getWorkflow(execution.workflowId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Start with execution context
    let enrichedContext: Record<string, unknown> = { ...(execution.context ?? {}) };

    // Check if this execution was triggered by an issue automation
    const issueExecution = await getByWorkflowExecutionId(id);
    if (issueExecution) {
      const issueMeta = await getIssueMetadata(issueExecution.issueMetadataId);
      if (issueMeta) {
        // Inject issue info for git-checkout and other nodes
        enrichedContext = {
          ...enrichedContext,
          issueInfo: {
            owner: issueMeta.owner,
            repo: issueMeta.repo,
            issueNumber: issueMeta.issueNumber,
            projectId: issueMeta.projectId,
          },
        };
      }
    }

    // Return workflow data needed for execution
    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      initialContext: enrichedContext,
    });
  } catch (error) {
    logger.error('Failed to get execution workflow', { error: error });

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
