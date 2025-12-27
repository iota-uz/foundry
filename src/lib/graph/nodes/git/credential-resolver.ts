/**
 * Git Credential Resolver
 *
 * Resolves GitHub tokens from the execution context by traversing:
 * issueMetadataId → projectId → project.githubCredentialId → decrypted token
 */

import { getIssueMetadata } from '@/lib/db/repositories/issue-metadata.repository';
import { getProject } from '@/lib/db/repositories/project.repository';
import { resolveProjectToken } from '@/lib/github/token-resolver';

/**
 * Git checkout context with resolved credentials
 */
export interface GitCheckoutContext {
  /** Repository owner (user or org) */
  owner: string;
  /** Repository name */
  repo: string;
  /** GitHub PAT for authentication */
  token: string;
  /** Issue number (if from issue context) */
  issueNumber?: number;
  /** Project ID (if from issue context) */
  projectId?: string;
}

/**
 * Options for credential resolution
 */
export interface ResolveCredentialsOptions {
  /** Issue metadata ID from execution context */
  issueMetadataId?: string;
  /** Manual override for owner */
  owner?: string;
  /** Manual override for repo */
  repo?: string;
}

/**
 * Resolve Git checkout credentials from execution context
 *
 * Resolution priority:
 * 1. If issueMetadataId provided, fetch owner/repo from issue metadata
 *    and token from the linked project's credential
 * 2. If owner/repo override provided, use those but still resolve token
 *    from the issue's project
 * 3. Fallback to environment GITHUB_TOKEN if no project context
 *
 * @param options - Resolution options
 * @returns Resolved checkout context with credentials
 * @throws Error if credentials cannot be resolved
 */
export async function resolveGitCredentials(
  options: ResolveCredentialsOptions
): Promise<GitCheckoutContext> {
  const { issueMetadataId, owner: ownerOverride, repo: repoOverride } = options;

  // Path 1: Resolve from issue context
  if (issueMetadataId) {
    const issueMeta = await getIssueMetadata(issueMetadataId);
    if (!issueMeta) {
      throw new Error(`Issue metadata not found: ${issueMetadataId}`);
    }

    // Use override if provided, otherwise use issue's repo info
    const owner = ownerOverride ?? issueMeta.owner;
    const repo = repoOverride ?? issueMeta.repo;

    // Resolve token from project
    const project = await getProject(issueMeta.projectId);
    if (!project) {
      throw new Error(
        `Project not found for issue metadata: ${issueMeta.projectId}`
      );
    }

    const token = await resolveProjectToken(project);

    return {
      owner,
      repo,
      token,
      issueNumber: issueMeta.issueNumber,
      projectId: issueMeta.projectId,
    };
  }

  // Path 2: Manual override with environment token
  if (ownerOverride && repoOverride) {
    const envToken = process.env.GITHUB_TOKEN;
    if (!envToken) {
      throw new Error(
        'GITHUB_TOKEN environment variable required when not using issue context'
      );
    }

    return {
      owner: ownerOverride,
      repo: repoOverride,
      token: envToken,
    };
  }

  // No valid resolution path
  throw new Error(
    'Git checkout requires either issueMetadataId in context or manual owner/repo configuration with GITHUB_TOKEN'
  );
}
