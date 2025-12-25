/**
 * OpenAPI artifact API routes
 * GET /api/artifacts/openapi - Get OpenAPI spec
 * PUT /api/artifacts/openapi - Update OpenAPI spec
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import type { OpenAPIResponse } from '@/types/api/responses';
import { parseOpenAPIEndpoints } from '@/lib/parsers/openapi.parser';

/**
 * GET /api/artifacts/openapi - Get OpenAPI spec
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
    const spec = await specService.getOpenAPI(projectPath);

    // Parse OpenAPI spec to extract endpoints
    const endpoints = parseOpenAPIEndpoints(spec);
    const response: OpenAPIResponse = {
      openapi: {
        spec,
        endpoints,
        lastUpdated: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get OpenAPI spec: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/artifacts/openapi - Update OpenAPI spec
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
    const { spec } = body;

    if (!spec || typeof spec !== 'object') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request: spec must be an object',
          },
        },
        { status: 400 }
      );
    }

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    await specService.updateOpenAPI(projectPath, spec);

    // Parse OpenAPI spec to extract endpoints
    const endpoints = parseOpenAPIEndpoints(spec);
    const response: OpenAPIResponse = {
      openapi: {
        spec,
        endpoints,
        lastUpdated: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to update OpenAPI spec: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
