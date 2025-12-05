/**
 * Dependency Parser for GitHub Issue Bodies
 *
 * Parses issue bodies for dependency declarations in formats like:
 * - Depends on #123
 * - Depends on owner/repo#123
 * - Depends on iota-uz/foundry#123
 * - Multiple: Depends on #1, #2, owner/repo#3
 */

import type { DependencyRef } from './types';

/**
 * Regular expression patterns for dependency parsing
 *
 * Matches various formats:
 * - "Depends on #123"
 * - "depends on iota-uz/foundry#123"
 * - "Blocked by #123"
 * - "blocked by owner/repo#123"
 * - "Requires #123"
 */
const DEPENDENCY_PATTERNS = [
  // "Depends on" followed by one or more references (with word boundary)
  /\bdepends?\s+on\s+([^.\n]+)/gi,
  // "Blocked by" followed by one or more references (with word boundary)
  /\bblocked?\s+by\s+([^.\n]+)/gi,
  // "Requires" followed by one or more references (with word boundary)
  /\brequires?\s+([^.\n]+)/gi,
  // "After" followed by one or more references (with word boundary)
  /\bafter\s+([^.\n]+)/gi,
];

/**
 * Pattern to extract individual issue references from a string
 * Matches: #123, owner/repo#123, or full URLs
 */
const ISSUE_REF_PATTERN =
  /(?:https?:\/\/github\.com\/)?([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)?#(\d+)/g;

/**
 * Parse dependency references from an issue body
 */
export function parseDependencies(
  body: string,
  defaultOwner: string,
  defaultRepo: string
): DependencyRef[] {
  if (!body || typeof body !== 'string') {
    return [];
  }

  const dependencies: DependencyRef[] = [];
  const seen = new Set<string>();

  // Extract dependency sections from the body
  for (const pattern of DEPENDENCY_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      const section = match[1];
      if (section) {
        // Parse individual references from this section
        const refs = parseIssueReferences(section, defaultOwner, defaultRepo);

        for (const ref of refs) {
          const key = `${ref.owner}/${ref.repo}#${ref.number}`;
          if (!seen.has(key)) {
            seen.add(key);
            dependencies.push(ref);
          }
        }
      }
    }
  }

  return dependencies;
}

/**
 * Parse individual issue references from a string
 */
export function parseIssueReferences(
  text: string,
  defaultOwner: string,
  defaultRepo: string
): DependencyRef[] {
  const refs: DependencyRef[] = [];

  // Reset lastIndex for global regex
  ISSUE_REF_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ISSUE_REF_PATTERN.exec(text)) !== null) {
    const repoRef = match[1]; // May be undefined for bare #123
    const issueNumber = match[2];

    if (issueNumber) {
      let owner = defaultOwner;
      let repo = defaultRepo;

      if (repoRef) {
        const [parsedOwner, parsedRepo] = repoRef.split('/');
        if (parsedOwner && parsedRepo) {
          owner = parsedOwner;
          repo = parsedRepo;
        }
      }

      refs.push({
        owner,
        repo,
        number: parseInt(issueNumber, 10),
      });
    }
  }

  return refs;
}

/**
 * Format a dependency reference as a string
 */
export function formatDependencyRef(ref: DependencyRef): string {
  return `${ref.owner}/${ref.repo}#${ref.number}`;
}

/**
 * Check if two dependency references are equal
 */
export function dependencyRefsEqual(a: DependencyRef, b: DependencyRef): boolean {
  return (
    a.owner.toLowerCase() === b.owner.toLowerCase() &&
    a.repo.toLowerCase() === b.repo.toLowerCase() &&
    a.number === b.number
  );
}

/**
 * Create a dependency reference from owner, repo, and number
 */
export function createDependencyRef(
  owner: string,
  repo: string,
  number: number
): DependencyRef {
  return { owner, repo, number };
}

/**
 * Parse a string reference like "owner/repo#123" or "#123"
 */
export function parseDependencyRefString(
  refString: string,
  defaultOwner: string,
  defaultRepo: string
): DependencyRef | null {
  const refs = parseIssueReferences(refString, defaultOwner, defaultRepo);
  return refs[0] ?? null;
}
