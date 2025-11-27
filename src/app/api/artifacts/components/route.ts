/**
 * Components artifact API routes
 * GET /api/artifacts/components - List all components
 * POST /api/artifacts/components - Create component
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { CreateComponentRequestSchema } from '@/schemas/api';
import type { ComponentsResponse, ComponentResponse } from '@/types/api/responses';
import { generateId } from '@/lib/utils/id';

/**
 * GET /api/artifacts/components - List all components
 */
export async function GET(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const type = request.nextUrl.searchParams.get('type') as 'page' | 'component' | null;

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
    const components = type
      ? await specService.listComponents(projectPath, type)
      : await specService.listComponents(projectPath);

    const response: ComponentsResponse = { components };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to list components: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/artifacts/components - Create component
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
    const parsed = CreateComponentRequestSchema.parse(body);

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    // Generate ID
    const id = generateId('comp');

    const component = await specService.createComponent(projectPath, {
      id,
      name: parsed.name,
      type: parsed.type,
      html: parsed.html,
      description: parsed.description,
    });

    const response: ComponentResponse = { component };
    return NextResponse.json(response, { status: 201 });
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

    if (message.includes('already exists')) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_ID',
            message: 'Component already exists',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to create component: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
