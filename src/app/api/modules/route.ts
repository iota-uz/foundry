/**
 * Modules API routes
 * GET /api/modules - List all modules
 * POST /api/modules - Create module
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { CreateModuleRequestSchema } from '@/schemas/api';
import type { ModulesResponse, ModuleResponse } from '@/types/api/responses';
import { generateSlug } from '@/lib/utils/slug';

/**
 * GET /api/modules - List all modules
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
    const modules = await specService.listModules(projectPath);

    const response: ModulesResponse = { modules };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to list modules: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/modules - Create module
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
    const parsed = CreateModuleRequestSchema.parse(body);

    // Generate slug from name
    const slug = generateSlug(parsed.name);

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    const module = await specService.createModule(projectPath, {
      slug,
      name: parsed.name,
      description: parsed.description,
      ...(parsed.order !== undefined && { order: parsed.order }),
    });

    const response: ModuleResponse = {
      module,
      features: [],
    };

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
            message: 'Module already exists',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to create module: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
