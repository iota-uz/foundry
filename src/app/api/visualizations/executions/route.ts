/**
 * Visualizations Executions API
 *
 * GET /api/visualizations/executions - List all executions across workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { listAllExecutions } from '@/lib/db/repositories/analytics.repository';

/**
 * List all executions across workflows with pagination
 *
 * Query params:
 * - limit: Maximum number of executions to return (default: 50)
 * - offset: Number of executions to skip (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = parseInt(limitParam !== null && limitParam !== '' ? limitParam : '50', 10);
    const offset = parseInt(offsetParam !== null && offsetParam !== '' ? offsetParam : '0', 10);

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    const result = await listAllExecutions(limit, offset);

    return NextResponse.json({
      executions: result.executions,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to list executions:', error);
    return NextResponse.json(
      { error: 'Failed to list executions' },
      { status: 500 }
    );
  }
}
