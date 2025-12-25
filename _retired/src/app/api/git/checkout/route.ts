/**
 * Git checkout API route
 * POST /api/git/checkout - Switch branch
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitService } from '@/services/support/git.service';
import { CheckoutRequestSchema } from '@/schemas/api';

/**
 * POST /api/git/checkout - Switch branch
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
    const parsed = CheckoutRequestSchema.parse(body);

    const gitService = createGitService(projectPath);

    if (parsed.create) {
      // Create new branch and checkout
      await gitService.createBranch(parsed.branch);
    } else {
      // Checkout existing branch
      await gitService.checkout(parsed.branch);
    }

    return NextResponse.json({ success: true, branch: parsed.branch });
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
          message: `Failed to checkout branch: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
