/**
 * Git commit API route
 * POST /api/git/commit - Commit changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitService } from '@/services/support/git.service';
import { CommitRequestSchema } from '@/schemas/api';

/**
 * POST /api/git/commit - Commit changes
 */
export async function POST(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath query parameter',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = CommitRequestSchema.parse(body);

    const gitService = createGitService(projectPath);
    await gitService.commit(parsed.message, parsed.files);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'GIT_ERROR',
          message: `Failed to commit: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
