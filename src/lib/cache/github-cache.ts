/**
 * GitHub API Cache Configuration
 *
 * Provides TTL values and cache key generators for GitHub API responses.
 */

import { TTLCache } from './ttl-cache';

/**
 * Cache TTL values in milliseconds
 */
export const CACHE_TTL = {
  /** Project items by status - 1 minute (frequently updated) */
  PROJECT_ITEMS: 60_000,

  /** Project validation - 5 minutes (moderately stable) */
  PROJECT_VALIDATION: 300_000,

  /** Project fields and options - 5 minutes (moderately stable) */
  PROJECT_FIELDS: 300_000,

  /** Repository labels - 15 minutes (rarely change) */
  REPO_LABELS: 900_000,

  /** Repository collaborators - 15 minutes (rarely change) */
  REPO_COLLABORATORS: 900_000,
} as const;

/**
 * Cache key generators for GitHub API responses.
 * Keys follow the format: gh:<resource>:<identifier>
 */
export const CacheKeys = {
  /**
   * Cache key for project items filtered by status
   *
   * @param owner - Project owner
   * @param num - Project number
   * @param status - Status filter value
   */
  projectItems: (owner: string, num: number, status: string): string =>
    `gh:proj:items:${owner}:${num}:${status.toLowerCase()}`,

  /**
   * Cache key for project validation
   *
   * @param owner - Project owner
   * @param num - Project number
   */
  projectValidation: (owner: string, num: number): string =>
    `gh:proj:validation:${owner}:${num}`,

  /**
   * Cache key for project fields
   *
   * @param owner - Project owner
   * @param num - Project number
   */
  projectFields: (owner: string, num: number): string =>
    `gh:proj:fields:${owner}:${num}`,

  /**
   * Cache key for repository labels
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  repoLabels: (owner: string, repo: string): string =>
    `gh:repo:labels:${owner}:${repo}`,

  /**
   * Cache key for repository collaborators
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  repoCollaborators: (owner: string, repo: string): string =>
    `gh:repo:collab:${owner}:${repo}`,
} as const;

/**
 * Shared GitHub API cache instance
 *
 * Max 1000 entries with LRU eviction.
 * TTL varies by resource type (see CACHE_TTL).
 */
export const githubCache = new TTLCache(1000);
