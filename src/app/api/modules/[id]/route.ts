/**
 * Module detail API routes
 * GET /api/modules/:id - Get module with features
 * PUT /api/modules/:id - Update module
 * DELETE /api/modules/:id - Delete module
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { UpdateModuleRequestSchema } from '@/schemas/api';
import type { ModuleResponse } from '@/types/api/responses';

/**
 * GET /api/modules/:id - Get module with features
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // params.id is the module slug
    const moduleData = await specService.getModule(projectPath, params.id);
    const features = await specService.listFeatures(projectPath, params.id);

    const response: ModuleResponse = { module: moduleData, features };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Module not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get module: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/modules/:id - Update module
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const parsed = UpdateModuleRequestSchema.parse(body);

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.description !== undefined) updates.description = parsed.description;
    if (parsed.order !== undefined) updates.order = parsed.order;

    const moduleData = await specService.updateModule(
      projectPath,
      params.id,
      updates
    );

    const features = await specService.listFeatures(projectPath, params.id);

    const response: ModuleResponse = { module: moduleData, features };
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
            message: 'Module not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to update module: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/modules/:id - Delete module
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    await specService.deleteModule(projectPath, params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Module not found',
          },
        },
        { status: 404 }
      );
    }

    if (message.includes('Cannot delete module with features')) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to delete module: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
