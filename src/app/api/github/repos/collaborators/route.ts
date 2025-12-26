/**
 * GitHub Repository Collaborators API
 *
 * Fetch collaborators for a GitHub repository for the visual configurator.
 * Uses POST to keep the token in the request body (not URL).
 */

import { NextRequest, NextResponse } from 'next/server';
import { IssuesClient } from '@/lib/github-issues';

interface FetchCollaboratorsRequest {
  token: string;
  owner: string;
  repo: string;
}

function validateRequest(body: Partial<FetchCollaboratorsRequest>): body is FetchCollaboratorsRequest {
  return Boolean(body.token && body.owner && body.repo);
}

/**
 * POST /api/github/repos/collaborators
 *
 * Fetch all collaborators for a GitHub repository
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<FetchCollaboratorsRequest>;

    if (!validateRequest(body)) {
      return NextResponse.json(
        { error: 'Missing required fields: token, owner, repo' },
        { status: 400 }
      );
    }

    // Create client and fetch collaborators
    const client = new IssuesClient({
      token: body.token,
    });

    const collaborators = await client.getRepositoryCollaborators(body.owner, body.repo);

    return NextResponse.json({
      collaborators,
    });
  } catch (error) {
    console.error('[API] /github/repos/collaborators error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch repository collaborators',
      },
      { status: 500 }
    );
  }
}
