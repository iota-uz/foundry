/**
 * Visualizations Analytics API
 *
 * GET /api/visualizations/analytics - Get node-level analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNodeAnalytics } from '@/lib/db/repositories/analytics.repository';
import { validateUuid, isValidationError } from '@/lib/validation';

/**
 * Get node-level analytics
 *
 * Query params:
 * - workflowId: Optional workflow ID to filter analytics by specific workflow
 *
 * Returns array of node analytics with performance metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const workflowId = searchParams.get('workflowId');

    // Validate workflow ID if provided
    if (workflowId !== null && workflowId !== '') {
      const validId = validateUuid(workflowId);
      if (isValidationError(validId)) {
        return validId;
      }

      const nodes = await getNodeAnalytics(validId);
      return NextResponse.json({ nodes });
    }

    // No workflow ID provided - get analytics for all workflows
    const nodes = await getNodeAnalytics();
    return NextResponse.json({ nodes });
  } catch (error) {
    console.error('Failed to get node analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get node analytics' },
      { status: 500 }
    );
  }
}
