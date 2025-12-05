/**
 * Schema artifact API routes
 * GET /api/artifacts/schema - Get full DBML schema
 * PUT /api/artifacts/schema - Update full schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import type { SchemaResponse } from '@/types/api/responses';
import { parseDBMLEntities, parseDBMLRelationships } from '@/lib/parsers/dbml.parser';

/**
 * GET /api/artifacts/schema - Get full DBML schema
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
    const dbml = await specService.getSchema(projectPath);

    // Parse DBML to extract entities and relationships
    const entities = parseDBMLEntities(dbml);
    const relationships = parseDBMLRelationships(dbml);
    const response: SchemaResponse = {
      schema: {
        dbml,
        entities,
        relationships,
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
          message: `Failed to get schema: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/artifacts/schema - Update full schema
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
    const { dbml } = body;

    if (typeof dbml !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request: dbml must be a string',
          },
        },
        { status: 400 }
      );
    }

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    await specService.updateSchema(projectPath, dbml);

    // Parse DBML to extract entities and relationships
    const entities = parseDBMLEntities(dbml);
    const relationships = parseDBMLRelationships(dbml);
    const response: SchemaResponse = {
      schema: {
        dbml,
        entities,
        relationships,
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
          message: `Failed to update schema: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
