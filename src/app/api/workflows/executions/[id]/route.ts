/**
 * Workflow Execution API
 *
 * GET /api/workflows/executions/:id - Get execution by ID
 */

import { NextResponse } from 'next/server';
import { getExecution } from '@/lib/db/repositories/workflow.repository';
import { validateUuid, isValidationError } from '@/lib/validation';
import { createLogger } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const logger = createLogger({ route: 'GET /api/workflows/executions/:id' });

/**
 * Get execution by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    const execution = await getExecution(validId);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(execution);
  } catch (error) {
    logger.error('Failed to get execution', { error: error });
    return NextResponse.json(
      { error: 'Failed to get execution' },
      { status: 500 }
    );
  }
}
