/**
 * Project detail API routes
 * GET /api/projects/:id - Get project details
 * PUT /api/projects/:id - Update project
 * DELETE /api/projects/:id - Delete project
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { UpdateProjectRequestSchema } from '@/schemas/api';
import type { ProjectResponse } from '@/types/api/responses';

/**
 * GET /api/projects/:id - Get project details
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

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    const project = await specService.getProject(projectPath);

    const response: ProjectResponse = { project };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get project: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/:id - Update project
 */
export async function PUT(request: NextRequest) {
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
    const parsed = UpdateProjectRequestSchema.parse(body);

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const updates: Record<string, any> = {};
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.description !== undefined) updates.description = parsed.description;
    if (parsed.settings !== undefined) updates.settings = parsed.settings;

    const project = await specService.updateProject(projectPath, updates as any);

    const response: ProjectResponse = { project };
    return NextResponse.json(response);
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

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to update project: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/:id - Delete project
 */
export async function DELETE(request: NextRequest) {
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

    const fileService = getFileService();
    const foundryPath = `${projectPath}/.foundry`;

    // Delete the entire .foundry directory
    await fileService.delete(foundryPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to delete project: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
