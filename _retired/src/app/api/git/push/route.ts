/**
 * Git push API route
 * POST /api/git/push - Push to remote
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGitService } from '@/services/support/git.service';

/**
 * POST /api/git/push - Push to remote
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

    const gitService = createGitService(projectPath);

    // Check if remote exists
    const hasRemote = await gitService.hasRemote();
    if (!hasRemote) {
      return NextResponse.json(
        {
          error: {
            code: 'GIT_ERROR',
            message: 'No remote repository configured',
          },
        },
        { status: 400 }
      );
    }

    await gitService.push();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for common push errors
    if (message.includes('rejected') || message.includes('non-fast-forward')) {
      return NextResponse.json(
        {
          error: {
            code: 'GIT_ERROR',
            message: 'Push rejected. Pull changes first.',
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'GIT_ERROR',
          message: `Failed to push: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
