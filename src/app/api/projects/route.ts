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
import type { Project } from '@/types/domain/project';
import path from 'path';

/**
 * GET /api/projects - List all projects
 */
export async function GET(request: NextRequest) {
  try {
    const searchPath = request.nextUrl.searchParams.get('searchPath');

    // If no search path provided, check common locations or return empty
    if (!searchPath) {
      // For now, return empty list when no search path is provided
      // In the future, this could scan the user's home directory or configured paths
      const response: ProjectsResponse = {
        projects: [],
      };
      return NextResponse.json(response);
    }

    const fileService = getFileService();

    // Check if the provided path exists
    const exists = await fileService.exists(searchPath);
    if (!exists) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search path does not exist',
          },
        },
        { status: 400 }
      );
    }

    // Look for .foundry directories under the search path
    const projects = await discoverProjects(searchPath, fileService);

    const response: ProjectsResponse = {
      projects,
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
 * Discover projects by scanning for .foundry directories
 */
async function discoverProjects(
  searchPath: string,
  fileService: ReturnType<typeof getFileService>
): Promise<Project[]> {
  const projects: Project[] = [];

  try {
    // Use fs.readdir to scan directories in the search path (non-recursive for performance)
    const fs = await import('fs/promises');
    const entries = await fs.readdir(searchPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(searchPath, entry.name);
        const foundryPath = path.join(projectPath, '.foundry');

        // Check if .foundry directory exists
        const hasFoundry = await fileService.exists(foundryPath);
        if (hasFoundry) {
          // Try to read project.yaml
          const projectYamlPath = path.join(foundryPath, 'project.yaml');
          const hasProjectYaml = await fileService.exists(projectYamlPath);

          if (hasProjectYaml) {
            try {
              const projectData = await fileService.readYaml<Project>(projectYamlPath);
              projects.push(projectData);
            } catch (error) {
              // Skip projects with invalid project.yaml
              console.error(`Failed to read project at ${projectPath}:`, error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error discovering projects:', error);
    // Return empty array on error
  }

  return projects;
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
