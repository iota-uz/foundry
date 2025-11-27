/**
 * GraphQL artifact API routes
 * GET /api/artifacts/graphql - Get GraphQL schema
 * PUT /api/artifacts/graphql - Update GraphQL schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import type { GraphQLResponse } from '@/types/api/responses';

/**
 * GET /api/artifacts/graphql - Get GraphQL schema
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
    const schema = await specService.getGraphQL(projectPath);

    // TODO: Parse GraphQL schema to extract types and operations
    const response: GraphQLResponse = {
      graphql: {
        schema,
        types: [],
        operations: [],
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
          message: `Failed to get GraphQL schema: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/artifacts/graphql - Update GraphQL schema
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
    const { schema } = body;

    if (typeof schema !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request: schema must be a string',
          },
        },
        { status: 400 }
      );
    }

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    await specService.updateGraphQL(projectPath, schema);

    const response: GraphQLResponse = {
      graphql: {
        schema,
        types: [],
        operations: [],
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
          message: `Failed to update GraphQL schema: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
