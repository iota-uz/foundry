/**
 * Visualizations Stats API
 *
 * GET /api/visualizations/stats - Get aggregated execution statistics
 */

import { NextResponse } from 'next/server';
import { getExecutionStats } from '@/lib/db/repositories/analytics.repository';

/**
 * Get aggregated execution statistics
 *
 * Returns counts by status, success rate, and average duration.
 */
export async function GET() {
  try {
    const stats = await getExecutionStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get execution stats:', error);
    return NextResponse.json(
      { error: 'Failed to get execution statistics' },
      { status: 500 }
    );
  }
}
