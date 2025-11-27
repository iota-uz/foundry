/**
 * Git branches API route
 * GET /api/git/branches - List branches
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGitService } from '@/services/support/git.service';
import type { GitBranchesResponse } from '@/types/api/responses';

/**
 * GET /api/git/branches - List branches
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
    const branches = await gitService.getBranches();
    const currentBranch = await gitService.getCurrentBranch();

    const response: GitBranchesResponse = {
      branches,
      current: currentBranch,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'GIT_ERROR',
          message: `Failed to get branches: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
