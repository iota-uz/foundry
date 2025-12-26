/**
 * GitHub Projects Fields API
 *
 * Fetch project fields and their options for the visual configurator.
 * Uses POST to keep the token in the request body (not URL).
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProjectsClient } from '@/lib/github-projects';

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

    const validation = await client.validate();

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Project validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Fetch all fields
    const fieldsMap = await client.fetchAllFields();
    const fields = Array.from(fieldsMap.values());

    return NextResponse.json({
      project: validation.project,
      fields,
    });
  } catch (error) {
    console.error('[API] /github/projects/fields error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch project fields',
      },
      { status: 500 }
    );
  }
}
