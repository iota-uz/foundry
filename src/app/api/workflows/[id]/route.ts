/**
 * Single Workflow API
 *
 * GET /api/workflows/:id - Get a workflow
 *
 * Note: Mutations (PUT/DELETE) are handled via Server Actions
 * @see src/lib/actions/workflows.ts
 */

import { NextResponse } from 'next/server';
import { getWorkflow } from '@/lib/db/repositories/workflow.repository';
import { validateUuid, isValidationError } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get a workflow by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    const workflow = await getWorkflow(validId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to get workflow:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow' },
      { status: 500 }
    );
  }
}
