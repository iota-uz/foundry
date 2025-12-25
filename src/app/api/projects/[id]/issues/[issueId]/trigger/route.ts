/**
 * Issue Trigger API
 *
 * POST /api/projects/:id/issues/:issueId/trigger - Manually trigger automation
 */

import { NextResponse } from 'next/server';
import {
  AutomationRepository,
  ProjectRepository,
  IssueMetadataRepository,
} from '@/lib/db/repositories';
import {
  validateBody,
  validateUuid,
  isValidationError,
  triggerAutomationSchema,
} from '@/lib/validation';
import { triggerManualAutomation } from '@/lib/projects/automation-engine';

interface RouteParams {
  params: Promise<{ id: string; issueId: string }>;
}

/**
 * Manually trigger an automation for an issue
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id, issueId } = await params;

    const validId = validateUuid(id);
    if (validId instanceof NextResponse) {
      return validId;
    }

    const validIssueId = validateUuid(issueId);
    if (validIssueId instanceof NextResponse) {
      return validIssueId;
    }

    // Validate request body
    const result = await validateBody(request, triggerAutomationSchema);
    if (isValidationError(result)) {
      return result;
    }

    // Check if project exists
    const project = await ProjectRepository.getProject(validId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if issue metadata exists and belongs to project
    const issue = await IssueMetadataRepository.getIssueMetadata(validIssueId);
    if (!issue || issue.projectId !== validId) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Check if automation exists, is manual, and belongs to project
    const automation = await AutomationRepository.getAutomation(result.automationId);
    if (!automation || automation.projectId !== validId) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    if (automation.triggerType !== 'manual') {
      return NextResponse.json(
        { error: 'Automation is not a manual trigger' },
        { status: 400 }
      );
    }

    if (!automation.enabled) {
      return NextResponse.json(
        { error: 'Automation is disabled' },
        { status: 400 }
      );
    }

    // Trigger the automation asynchronously (don't wait for completion)
    triggerManualAutomation(result.automationId, validIssueId).catch((error) => {
      console.error('Manual automation trigger failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Automation triggered successfully',
    });
  } catch (error) {
    console.error('Failed to trigger automation:', error);
    return NextResponse.json(
      { error: 'Failed to trigger automation' },
      { status: 500 }
    );
  }
}
