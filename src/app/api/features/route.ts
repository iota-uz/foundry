/**
 * Features API routes
 * GET /api/features - List all features (with filters)
 * POST /api/features - Create feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { CreateFeatureRequestSchema } from '@/schemas/api';
import type { FeaturesResponse, FeatureResponse } from '@/types/api/responses';
import { generateSlug } from '@/lib/utils/slug';

/**
 * GET /api/features - List all features
 */
export async function GET(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const moduleId = request.nextUrl.searchParams.get('moduleId');

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

    // If moduleId provided, list features for that module only
    const features = moduleId
      ? await specService.listFeatures(projectPath, moduleId)
      : await specService.listFeatures(projectPath);

    const response: FeaturesResponse = { features };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to list features: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features - Create feature
 */
export async function POST(request: NextRequest) {
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
    const parsed = CreateFeatureRequestSchema.parse(body);

    // Generate slug from name
    const slug = generateSlug(parsed.name);

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    // moduleId is actually a slug, we need to extract the actual module slug
    // For now, assume moduleId is the slug
    const feature = await specService.createFeature(projectPath, parsed.moduleId, {
      slug,
      name: parsed.name,
      description: parsed.description,
    });

    const response: FeatureResponse = { feature };
    return NextResponse.json(response, { status: 201 });
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

    if (message.includes('already exists')) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_ID',
            message: 'Feature already exists',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to create feature: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
