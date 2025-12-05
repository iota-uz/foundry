/**
 * Schema Entity Detail API route
 * GET /api/artifacts/schema/entities/[name] - Get entity details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';

interface EntityDetail {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    constraints: string[];
    note?: string;
  }>;
  indexes: Array<{
    fields: string[];
    unique?: boolean;
    name?: string;
  }>;
  relationships: Array<{
    field: string;
    referencesTable: string;
    referencesField: string;
    type: string;
  }>;
  note?: string;
}

/**
 * GET /api/artifacts/schema/entities/[name] - Get entity details
 */
export async function GET(request: NextRequest, props: { params: Promise<{ name: string }> }) {
  const params = await props.params;
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
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Schema not found',
          },
        },
        { status: 404 }
      );
    }

    // Parse entity details from DBML
    const entity = parseEntityDetails(schemaDbml, params.name);

    if (!entity) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Entity not found: ${params.name}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ entity });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get entity: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Parse DBML to extract detailed entity information
 */
function parseEntityDetails(dbml: string, entityName: string): EntityDetail | null {
  // Find the specific table
  const tableRegex = new RegExp(`Table\\s+${entityName}\\s*\\{([^}]+)\\}`, 'i');
  const tableMatch = dbml.match(tableRegex);

  if (!tableMatch || !tableMatch[1]) {
    return null;
  }

  const tableBody = tableMatch[1];

  // Parse fields with constraints
  const fields: EntityDetail['fields'] = [];
  const fieldRegex = /^\s*(\w+)\s+(\w+(?:\([^)]+\))?)\s*(.*?)$/gm;
  let fieldMatch;

  while ((fieldMatch = fieldRegex.exec(tableBody)) !== null) {
    if (fieldMatch[1] && fieldMatch[2]) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const constraintsStr = fieldMatch[3] || '';

      // Extract constraints
      const constraints: string[] = [];
      if (constraintsStr.includes('pk')) constraints.push('PRIMARY KEY');
      if (constraintsStr.includes('not null')) constraints.push('NOT NULL');
      if (constraintsStr.includes('unique')) constraints.push('UNIQUE');
      if (constraintsStr.includes('increment')) constraints.push('AUTO_INCREMENT');

      // Extract field note
      const noteMatch = constraintsStr.match(/note:\s*['"]([^'"]+)['"]/i);

      const field: EntityDetail['fields'][0] = {
        name: fieldName,
        type: fieldType,
        constraints,
      };

      if (noteMatch && noteMatch[1]) {
        field.note = noteMatch[1];
      }

      fields.push(field);
    }
  }

  // Parse indexes
  const indexes: EntityDetail['indexes'] = [];
  const indexRegex = /indexes\s*\{([^}]+)\}/i;
  const indexMatch = tableBody.match(indexRegex);

  if (indexMatch && indexMatch[1]) {
    const indexBody = indexMatch[1];
    const indexLineRegex = /\(([^)]+)\)\s*(.*?)$/gm;
    let indexLineMatch;

    while ((indexLineMatch = indexLineRegex.exec(indexBody)) !== null) {
      if (indexLineMatch[1]) {
        const indexFields = indexLineMatch[1].split(',').map((f) => f.trim());
        const isUnique = indexLineMatch[2]?.includes('unique') || false;

        indexes.push({
          fields: indexFields,
          unique: isUnique,
        });
      }
    }
  }

  // Parse relationships (Ref syntax)
  const relationships: EntityDetail['relationships'] = [];
  const refRegex = new RegExp(`${entityName}\\.([\\w]+)\\s+[<>-]+\\s+([\\w]+)\\.([\\w]+)`, 'gi');
  let refMatch;

  while ((refMatch = refRegex.exec(dbml)) !== null) {
    if (refMatch[1] && refMatch[2] && refMatch[3]) {
      relationships.push({
        field: refMatch[1],
        referencesTable: refMatch[2],
        referencesField: refMatch[3],
        type: 'many-to-one',
      });
    }
  }

  // Extract table note
  const tableNoteRegex = /Note:\s*['"]([^'"]+)['"]/;
  const tableNoteMatch = tableBody.match(tableNoteRegex);

  const entity: EntityDetail = {
    name: entityName,
    fields,
    indexes,
    relationships,
  };

  if (tableNoteMatch && tableNoteMatch[1]) {
    entity.note = tableNoteMatch[1];
  }

  return entity;
}
