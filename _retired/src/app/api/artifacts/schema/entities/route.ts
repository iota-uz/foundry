/**
 * Schema Entities API route
 * GET /api/artifacts/schema/entities - List all entities from schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';

interface EntitySummary {
  name: string;
  fieldCount: number;
  fields: Array<{ name: string; type: string }>;
  description?: string;
}

/**
 * GET /api/artifacts/schema/entities - List all entities
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

    // Get schema DBML
    const schemaDbml = await specService.getSchema(projectPath);

    if (!schemaDbml) {
      return NextResponse.json({
        entities: [],
      });
    }

    // Parse entities from DBML
    const entities = parseDBMLEntities(schemaDbml);

    return NextResponse.json({
      entities,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to list entities: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Parse DBML to extract entities with details
 */
function parseDBMLEntities(dbml: string): EntitySummary[] {
  const entities: EntitySummary[] = [];

  // Parse DBML tables
  const tableRegex = /Table\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = tableRegex.exec(dbml)) !== null) {
    const tableName = match[1];
    const tableBody = match[2];

    if (!tableName || !tableBody) continue;

    // Extract fields with types
    const fieldRegex = /^\s*(\w+)\s+(\w+(?:\([^)]+\))?)/gm;
    const fields: Array<{ name: string; type: string }> = [];
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(tableBody)) !== null) {
      if (fieldMatch[1] && fieldMatch[2]) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2],
        });
      }
    }

    // Extract note/description if present
    const noteRegex = /Note:\s*['"]([^'"]+)['"]/;
    const noteMatch = tableBody.match(noteRegex);

    const entity: EntitySummary = {
      name: tableName,
      fieldCount: fields.length,
      fields,
    };

    if (noteMatch && noteMatch[1]) {
      entity.description = noteMatch[1];
    }

    entities.push(entity);
  }

  return entities;
}
