/**
 * Component detail API routes
 * GET /api/artifacts/components/:id - Get component with HTML
 * PUT /api/artifacts/components/:id - Update component
 * DELETE /api/artifacts/components/:id - Delete component
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { UpdateComponentRequestSchema } from '@/schemas/api';
import type { ComponentResponse } from '@/types/api/responses';

/**
 * GET /api/artifacts/components/:id - Get component
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
    const component = await specService.getComponent(projectPath, params.id);

    const response: ComponentResponse = { component };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Component not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get component: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/artifacts/components/:id - Update component
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
    const parsed = UpdateComponentRequestSchema.parse(body);

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.html !== undefined) updates.html = parsed.html;
    if (parsed.description !== undefined) updates.description = parsed.description;

    const component = await specService.updateComponent(
      projectPath,
      params.id,
      updates
    );

    const response: ComponentResponse = { component };
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
            message: 'Component not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to update component: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/artifacts/components/:id - Delete component
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
    await specService.deleteComponent(projectPath, params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Component not found',
          },
        },
        { status: 404 }
      );
    }

    if (message.includes('Cannot delete component referenced by features')) {
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
          message: `Failed to delete component: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
