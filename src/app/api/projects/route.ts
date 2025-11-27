/**
 * Projects API routes
 * GET /api/projects - List all projects
 * POST /api/projects - Create new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getFileService } from '@/services/core/file.service';
import { CreateProjectRequestSchema } from '@/schemas/api';
import type { ProjectsResponse } from '@/types/api/responses';
import path from 'path';

/**
 * GET /api/projects - List all projects
 */
export async function GET() {
  try {
    // For now, return empty list as we don't have a global project registry
    // In a real implementation, this would scan a known directory or use a database
    // TODO: Implement project discovery mechanism
    const response: ProjectsResponse = {
      projects: [],
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to list projects: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects - Create new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = CreateProjectRequestSchema.parse(body);

    // Initialize .foundry directory structure
    const fileService = getFileService();
    const foundryPath = path.join(parsed.path, '.foundry');

    // Check if project already exists
    const exists = await fileService.exists(foundryPath);
    if (exists) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project already exists at this path',
          },
        },
        { status: 400 }
      );
    }

    // Create directory structure
    await fileService.ensureDir(foundryPath);
    await fileService.ensureDir(path.join(foundryPath, 'modules'));
    await fileService.ensureDir(path.join(foundryPath, 'schemas'));
    await fileService.ensureDir(path.join(foundryPath, 'apis'));
    await fileService.ensureDir(path.join(foundryPath, 'components', 'pages'));
    await fileService.ensureDir(path.join(foundryPath, 'components', 'shared'));

    // Create project.yaml
    const project = {
      id: `proj_${Date.now()}`,
      name: parsed.name,
      description: parsed.description,
      path: parsed.path,
      mode: parsed.mode,
      phase: 'cpo' as const,
      settings: {
        defaultBranch: 'main',
        autoSave: true,
        autoCommit: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const projectFile = path.join(foundryPath, 'project.yaml');
    await fileService.writeYaml(projectFile, project);

    return NextResponse.json({ project }, { status: 201 });
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
          message: `Failed to create project: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
