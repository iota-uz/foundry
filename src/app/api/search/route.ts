/**
 * Global search API route
 * GET /api/search - Search across all spec content
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { SearchQueryParamsSchema } from '@/schemas/api';
import type { SearchResponse } from '@/types/api/responses';

/**
 * GET /api/search - Global search
 */
export async function GET(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const q = request.nextUrl.searchParams.get('q');
    const types = request.nextUrl.searchParams.get('types');
    const limitParam = request.nextUrl.searchParams.get('limit');

    if (!projectPath || !q) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath or q query parameter',
          },
        },
        { status: 400 }
      );
    }

    // Validate query params
    const params = SearchQueryParamsSchema.parse({
      q,
      types: types || undefined,
      limit: limitParam ? parseInt(limitParam) : undefined,
    });

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    const limit = params.limit || 10;
    const searchTypes = params.types?.split(',') || [
      'feature',
      'entity',
      'endpoint',
      'component',
    ];

    const results: SearchResponse['results'] = {
      features: [],
      entities: [],
      endpoints: [],
      components: [],
    };

    // Search features
    if (searchTypes.includes('feature')) {
      const features = await specService.listFeatures(projectPath);
      const query = params.q.toLowerCase();

      for (const feature of features) {
        if (
          feature.name.toLowerCase().includes(query) ||
          feature.description.toLowerCase().includes(query)
        ) {
          results.features.push({
            id: feature.id,
            type: 'feature',
            name: feature.name,
            matchedText: feature.description.substring(0, 100),
            location: `features/${feature.id}`,
          });

          if (results.features.length >= limit) break;
        }
      }
    }

    // Search components
    if (searchTypes.includes('component')) {
      const components = await specService.listComponents(projectPath);
      const query = params.q.toLowerCase();

      for (const component of components) {
        if (
          component.name.toLowerCase().includes(query) ||
          component.description.toLowerCase().includes(query)
        ) {
          results.components.push({
            id: component.id,
            type: 'component',
            name: component.name,
            matchedText: component.description.substring(0, 100),
            location: `components/${component.type}s/${component.id}`,
          });

          if (results.components.length >= limit) break;
        }
      }
    }

    // Search entities (from schema)
    if (searchTypes.includes('entity')) {
      try {
        const schemaDbml = await specService.getSchema(projectPath);
        if (schemaDbml) {
          const entities = parseDBMLEntities(schemaDbml);
          const query = params.q.toLowerCase();

          for (const entity of entities) {
            if (
              entity.name.toLowerCase().includes(query) ||
              entity.fields.some((f) => f.toLowerCase().includes(query))
            ) {
              results.entities.push({
                id: entity.name,
                type: 'entity',
                name: entity.name,
                matchedText: `Table with ${entity.fields.length} fields`,
                location: `schema/entities/${entity.name}`,
              });

              if (results.entities.length >= limit) break;
            }
          }
        }
      } catch (error) {
        // Ignore schema parsing errors
      }
    }

    // Search endpoints (from OpenAPI)
    if (searchTypes.includes('endpoint')) {
      try {
        const openapiSpec = await specService.getOpenAPI(projectPath);
        if (openapiSpec && openapiSpec.paths) {
          const endpoints = parseOpenAPIEndpoints(openapiSpec);
          const query = params.q.toLowerCase();

          for (const endpoint of endpoints) {
            if (
              endpoint.path.toLowerCase().includes(query) ||
              endpoint.method.toLowerCase().includes(query) ||
              endpoint.description.toLowerCase().includes(query)
            ) {
              results.endpoints.push({
                id: `${endpoint.method}:${endpoint.path}`,
                type: 'endpoint',
                name: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
                matchedText: endpoint.description.substring(0, 100),
                location: `openapi/endpoints/${endpoint.method}${endpoint.path.replace(/\//g, '-')}`,
              });

              if (results.endpoints.length >= limit) break;
            }
          }
        }
      } catch (error) {
        // Ignore OpenAPI parsing errors
      }
    }

    const totalCount =
      results.features.length +
      results.entities.length +
      results.endpoints.length +
      results.components.length;

    const response: SearchResponse = {
      query: params.q,
      results,
      totalCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
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
          message: `Failed to search: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Parse DBML schema to extract entity names and fields
 */
function parseDBMLEntities(dbml: string): Array<{ name: string; fields: string[] }> {
  const entities: Array<{ name: string; fields: string[] }> = [];

  // Simple regex-based parser for DBML
  const tableRegex = /Table\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = tableRegex.exec(dbml)) !== null) {
    const tableName = match[1];
    const tableBody = match[2];

    if (!tableName || !tableBody) continue;

    // Extract field names
    const fieldRegex = /^\s*(\w+)\s+/gm;
    const fields: string[] = [];
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(tableBody)) !== null) {
      if (fieldMatch[1]) {
        fields.push(fieldMatch[1]);
      }
    }

    entities.push({ name: tableName, fields });
  }

  return entities;
}

/**
 * Parse OpenAPI spec to extract endpoints
 */
function parseOpenAPIEndpoints(
  spec: Record<string, unknown>
): Array<{ path: string; method: string; description: string }> {
  const endpoints: Array<{ path: string; method: string; description: string }> = [];

  if (!spec.paths) return endpoints;

  for (const [path, pathItem] of Object.entries(spec.paths as Record<string, unknown>)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
        const op = operation as string;
        endpoints.push({
          path,
          method: method.toLowerCase(),
          description: op.summary || op.description || '',
        });
      }
    }
  }

  return endpoints;
}
