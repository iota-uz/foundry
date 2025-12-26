/**
 * Workflows API
 *
 * GET /api/workflows - List all workflows
 *
 * Note: Mutations (POST) are handled via Server Actions
 * @see src/lib/actions/workflows.ts
 */

import { NextResponse } from 'next/server';
import { listWorkflows } from '@/lib/db/repositories/workflow.repository';

/**
 * List all workflows
 */
export async function GET() {
  try {
    const workflows = await listWorkflows();
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Failed to list workflows:', error);
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    );
  }
}
