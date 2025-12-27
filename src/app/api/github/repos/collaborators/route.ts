/**
 * GitHub Repository Collaborators API
 *
 * Fetch collaborators for a GitHub repository for the visual configurator.
 * Uses POST to keep the token in the request body (not URL).
 */

import { NextRequest, NextResponse } from 'next/server';
import { IssuesClient } from '@/lib/github-issues';
import { githubCache, CACHE_TTL, CacheKeys } from '@/lib/cache';
import type { GitHubUser } from '@/lib/github-issues/types';
import { createLogger } from '@/lib/logging';

interface FetchCollaboratorsRequest {
  token: string;
  owner: string;
  repo: string;
}

function validateRequest(body: Partial<FetchCollaboratorsRequest>): body is FetchCollaboratorsRequest {
  return Boolean(body.token && body.owner && body.repo);
}

const logger = createLogger({ route: 'POST /api/github/repos/collaborators' });

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

    // Cache repository collaborators
    const cacheKey = CacheKeys.repoCollaborators(body.owner, body.repo);
    let collaborators = githubCache.get<GitHubUser[]>(cacheKey);

    if (!collaborators) {
      // Create client and fetch collaborators
      const client = new IssuesClient({
        token: body.token,
      });

      collaborators = await client.getRepositoryCollaborators(body.owner, body.repo);

      // Only cache successful responses
      if (collaborators && collaborators.length >= 0) {
        githubCache.set(cacheKey, collaborators, CACHE_TTL.REPO_COLLABORATORS);
      }
    }

    return NextResponse.json({
      collaborators,
    });
  } catch (error) {
    logger.error('Failed to fetch repository collaborators', { error: error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch repository collaborators',
      },
      { status: 500 }
    );
  }
}
