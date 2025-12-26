/**
 * Internal API: Secrets Download
 *
 * Returns decrypted workflow secrets for container execution.
 * GET /api/internal/executions/:id/secrets
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireValidToken } from '@/lib/railway/auth';
import { getExecution } from '@/lib/db/repositories/workflow.repository';
import { getDecryptedSecrets } from '@/lib/db/repositories/workflow-secrets.repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

    // Return secrets as key-value pairs
    return NextResponse.json(secrets);
  } catch (error) {
    console.error('[internal:secrets] Error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
