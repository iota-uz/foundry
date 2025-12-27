/**
 * GitHub Projects Fields API
 *
 * Fetch project fields and their options for the visual configurator.
 * Uses POST to keep the token in the request body (not URL).
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProjectsClient } from '@/lib/github-projects';
import { githubCache, CACHE_TTL, CacheKeys } from '@/lib/cache';
import type { ProjectValidation, ProjectField } from '@/lib/github-projects/types';
import { createLogger } from '@/lib/logging';

const logger = createLogger({ route: 'POST /api/github/projects/fields' });

interface FetchFieldsRequest {
  token: string;
  projectOwner: string;
  projectNumber: number;
}

/**
 * POST /api/github/projects/fields
 *
 * Fetch all fields for a GitHub Project V2
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FetchFieldsRequest;

    // Validate request
    if (!body.token || !body.projectOwner || !body.projectNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: token, projectOwner, projectNumber' },
        { status: 400 }
      );
    }

    // Create client and validate project
    const client = new ProjectsClient({
      token: body.token,
      projectOwner: body.projectOwner,
      projectNumber: body.projectNumber,
    });

    // Cache project validation
    const validationCacheKey = CacheKeys.projectValidation(
      body.projectOwner,
      body.projectNumber
    );
    let validation = githubCache.get<ProjectValidation>(validationCacheKey);

    if (!validation) {
      validation = await client.validate();
      if (validation.valid) {
        githubCache.set(validationCacheKey, validation, CACHE_TTL.PROJECT_VALIDATION);
      }
    }

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Project validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Cache project fields
    const fieldsCacheKey = CacheKeys.projectFields(
      body.projectOwner,
      body.projectNumber
    );
    let fields = githubCache.get<ProjectField[]>(fieldsCacheKey);

    if (!fields) {
      const fieldsMap = await client.fetchAllFields();
      fields = Array.from(fieldsMap.values());
      // Only cache successful responses
      if (fields && fields.length > 0) {
        githubCache.set(fieldsCacheKey, fields, CACHE_TTL.PROJECT_FIELDS);
      }
    }

    return NextResponse.json({
      project: validation.project,
      fields,
    });
  } catch (error) {
    logger.error('Failed to fetch project fields', { error: error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch project fields',
      },
      { status: 500 }
    );
  }
}
