/**
 * GitHub Repository Labels API
 *
 * Fetch labels for a GitHub repository for the visual configurator.
 * Uses POST to keep the token in the request body (not URL).
 */

import { NextRequest, NextResponse } from 'next/server';
import { IssuesClient } from '@/lib/github-issues';
import { githubCache, CACHE_TTL, CacheKeys } from '@/lib/cache';
import type { GitHubLabel } from '@/lib/github-issues/types';

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

    // Cache repository labels
    const cacheKey = CacheKeys.repoLabels(body.owner, body.repo);
    let labels = githubCache.get<GitHubLabel[]>(cacheKey);

    if (!labels) {
      // Create client and fetch labels
      const client = new IssuesClient({
        token: body.token,
      });

      labels = await client.getRepositoryLabels(body.owner, body.repo);

      // Only cache successful responses
      if (labels && labels.length >= 0) {
        githubCache.set(cacheKey, labels, CACHE_TTL.REPO_LABELS);
      }
    }

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
