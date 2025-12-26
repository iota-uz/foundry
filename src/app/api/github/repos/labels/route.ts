/**
 * GitHub Repository Labels API
 *
 * Fetch labels for a GitHub repository for the visual configurator.
 * Uses POST to keep the token in the request body (not URL).
 */

import { NextRequest, NextResponse } from 'next/server';
import { IssuesClient } from '@/lib/github-issues';

interface FetchLabelsRequest {
  token: string;
  owner: string;
  repo: string;
}

function validateRequest(body: Partial<FetchLabelsRequest>): body is FetchLabelsRequest {
  return Boolean(body.token && body.owner && body.repo);
}

/**
 * POST /api/github/repos/labels
 *
 * Fetch all labels for a GitHub repository
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<FetchLabelsRequest>;

    if (!validateRequest(body)) {
      return NextResponse.json(
        { error: 'Missing required fields: token, owner, repo' },
        { status: 400 }
      );
    }

    // Create client and fetch labels
    const client = new IssuesClient({
      token: body.token,
    });

    const labels = await client.getRepositoryLabels(body.owner, body.repo);

    return NextResponse.json({
      labels,
    });
  } catch (error) {
    console.error('[API] /github/repos/labels error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch repository labels',
      },
      { status: 500 }
    );
  }
}
