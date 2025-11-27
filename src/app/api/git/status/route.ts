/**
 * Git status API route
 * GET /api/git/status - Get current git status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGitService } from '@/services/support/git.service';
import type { GitStatus } from '@/types/api/responses';

/**
 * GET /api/git/status - Get current git status
 */
export async function GET(request: NextRequest) {
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
    const status = await gitService.getStatus();
    const hasConflicts = await gitService.hasConflicts();

    // Convert to API response format
    const response: GitStatus = {
      branch: status.branch,
      ahead: status.ahead,
      behind: status.behind,
      staged: status.changes
        .filter((c) => c.status !== 'untracked')
        .map((c) => c.path),
      unstaged: [], // simple-git combines these differently
      untracked: status.changes
        .filter((c) => c.status === 'untracked')
        .map((c) => c.path),
      hasConflicts,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'GIT_ERROR',
          message: `Failed to get git status: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
