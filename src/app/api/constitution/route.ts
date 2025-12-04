/**
 * Constitution API routes
 * GET /api/constitution - Get project constitution
 * PUT /api/constitution - Update constitution
 * DELETE /api/constitution - Remove constitution
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getFileService } from '@/services/core/file.service';
import { UpdateConstitutionRequestSchema } from '@/schemas/api';
import type { ConstitutionResponse } from '@/types/api/responses';
import type { Constitution } from '@/types/domain/constitution';
import path from 'path';

/**
 * GET /api/constitution - Get project constitution
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
    const constitutionPath = path.join(projectPath, '.foundry', 'constitution.yaml');

    const exists = await fileService.exists(constitutionPath);
    if (!exists) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Constitution not found',
          },
        },
        { status: 404 }
      );
    }

    const constitution = await fileService.readYaml<Constitution>(constitutionPath);
    const response: ConstitutionResponse = { constitution };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get constitution: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/constitution - Update constitution
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
    const parsed = UpdateConstitutionRequestSchema.parse(body);

    const fileService = getFileService();
    const constitutionPath = path.join(projectPath, '.foundry', 'constitution.yaml');

    // Load existing constitution if it exists
    let constitution: Constitution;
    const exists = await fileService.exists(constitutionPath);

    if (exists) {
      const existing = await fileService.readYaml<Constitution>(constitutionPath);
      // Merge updates carefully - use type assertion since it's validated by Zod
      const merged: Record<string, unknown> = {
        ...existing,
        ...(parsed.principles && { principles: parsed.principles }),
        ...(parsed.coding && { coding: { ...existing.coding, ...parsed.coding } }),
        ...(parsed.security && { security: { ...existing.security, ...parsed.security } }),
        ...(parsed.ux && { ux: { ...existing.ux, ...parsed.ux } }),
        ...(parsed.constraints && { constraints: { ...existing.constraints, ...parsed.constraints } }),
        ...(parsed.hooks && { hooks: { ...existing.hooks, ...parsed.hooks } }),
        updatedAt: new Date().toISOString(),
      };
      constitution = merged as Constitution;
    } else {
      // Create new constitution - provide defaults for all required fields
      const defaultConstitution: Record<string, unknown> = {
        version: '1.0',
        principles: parsed.principles ?? [],
        coding: parsed.coding ?? {
          naming: {
            functions: 'camelCase',
            classes: 'PascalCase',
            database_tables: 'snake_case',
            database_columns: 'snake_case',
          },
          style: {
            max_function_length: 50,
            require_docstrings: true,
            prefer_composition: true,
          },
        },
        security: parsed.security ?? {
          authentication: 'jwt',
          authorization: 'role-based',
          input_validation: 'zod',
          secrets: 'env-vars',
        },
        ux: parsed.ux ?? {
          error_format: 'user-friendly',
          loading_states: 'progressive',
          accessibility: 'wcag-aa',
        },
        constraints: parsed.constraints ?? {
          allowed_libraries: [],
          forbidden_libraries: [],
          node_version: 'v20',
        },
        hooks: parsed.hooks ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      constitution = defaultConstitution as Constitution;
    }

    await fileService.writeYaml(constitutionPath, constitution);

    const response: ConstitutionResponse = { constitution };
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
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to update constitution: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/constitution - Remove constitution
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
    const constitutionPath = path.join(projectPath, '.foundry', 'constitution.yaml');

    const exists = await fileService.exists(constitutionPath);
    if (!exists) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Constitution not found',
          },
        },
        { status: 404 }
      );
    }

    await fileService.delete(constitutionPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to delete constitution: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
