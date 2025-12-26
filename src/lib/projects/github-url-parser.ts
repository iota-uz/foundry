/**
 * GitHub Project URL Parser
 *
 * Parses GitHub Project V2 URLs to extract owner, project number, and type.
 *
 * Supported formats:
 * - https://github.com/users/username/projects/5
 * - https://github.com/orgs/orgname/projects/12
 * - github.com/users/username/projects/5 (without protocol)
 */

export interface ParsedGitHubProject {
  owner: string;
  projectNumber: number;
  type: 'user' | 'org';
}

/**
 * Parse a GitHub Project V2 URL
 *
 * @param url - GitHub project URL (with or without protocol)
 * @returns Parsed project data, or null if invalid
 *
 * @example
 * parseGitHubProjectUrl('https://github.com/users/alice/projects/5')
 * // => { owner: 'alice', projectNumber: 5, type: 'user' }
 *
 * parseGitHubProjectUrl('github.com/orgs/acme/projects/12')
 * // => { owner: 'acme', projectNumber: 12, type: 'org' }
 */
export function parseGitHubProjectUrl(url: string): ParsedGitHubProject | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Normalize URL - add protocol if missing
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const urlObj = new URL(normalizedUrl);

    // Must be github.com
    if (urlObj.hostname !== 'github.com') {
      return null;
    }

    // Parse pathname: /users/username/projects/N or /orgs/orgname/projects/N
    const pathRegex = /^\/(users|orgs)\/([^/]+)\/projects\/(\d+)\/?$/;
    const match = urlObj.pathname.match(pathRegex);

    if (!match) {
      return null;
    }

    const typeStr = match[1];
    const owner = match[2];
    const projectNumStr = match[3];

    if (typeStr === undefined || typeStr === '' || owner === undefined || owner === '' || projectNumStr === undefined || projectNumStr === '') {
      return null;
    }

    const projectNumber = parseInt(projectNumStr, 10);

    // Validate extracted values
    if (isNaN(projectNumber) || projectNumber < 1) {
      return null;
    }

    return {
      owner,
      projectNumber,
      type: typeStr === 'users' ? 'user' : 'org',
    };
  } catch {
    // Invalid URL format
    return null;
  }
}

/**
 * Validate a GitHub Project URL
 *
 * @param url - GitHub project URL to validate
 * @returns true if valid, false otherwise
 */
export function isValidGitHubProjectUrl(url: string): boolean {
  return parseGitHubProjectUrl(url) !== null;
}
