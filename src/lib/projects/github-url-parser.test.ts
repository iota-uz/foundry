/**
 * Tests for GitHub Project URL Parser
 */

import { describe, it, expect } from 'bun:test';
import { parseGitHubProjectUrl, isValidGitHubProjectUrl } from './github-url-parser';

describe('parseGitHubProjectUrl', () => {
  it('parses user project URL with https', () => {
    const result = parseGitHubProjectUrl('https://github.com/users/alice/projects/5');
    expect(result).toEqual({
      owner: 'alice',
      projectNumber: 5,
      type: 'user',
    });
  });

  it('parses org project URL with https', () => {
    const result = parseGitHubProjectUrl('https://github.com/orgs/acme/projects/12');
    expect(result).toEqual({
      owner: 'acme',
      projectNumber: 12,
      type: 'org',
    });
  });

  it('parses URL without protocol', () => {
    const result = parseGitHubProjectUrl('github.com/users/bob/projects/3');
    expect(result).toEqual({
      owner: 'bob',
      projectNumber: 3,
      type: 'user',
    });
  });

  it('parses URL with trailing slash', () => {
    const result = parseGitHubProjectUrl('https://github.com/orgs/myorg/projects/1/');
    expect(result).toEqual({
      owner: 'myorg',
      projectNumber: 1,
      type: 'org',
    });
  });

  it('returns null for invalid domain', () => {
    const result = parseGitHubProjectUrl('https://gitlab.com/users/alice/projects/5');
    expect(result).toBeNull();
  });

  it('returns null for invalid path format', () => {
    const result = parseGitHubProjectUrl('https://github.com/alice/projects/5');
    expect(result).toBeNull();
  });

  it('returns null for non-numeric project number', () => {
    const result = parseGitHubProjectUrl('https://github.com/users/alice/projects/abc');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseGitHubProjectUrl('');
    expect(result).toBeNull();
  });

  it('returns null for invalid URL', () => {
    const result = parseGitHubProjectUrl('not-a-url');
    expect(result).toBeNull();
  });
});

describe('isValidGitHubProjectUrl', () => {
  it('returns true for valid user project URL', () => {
    expect(isValidGitHubProjectUrl('https://github.com/users/alice/projects/5')).toBe(true);
  });

  it('returns true for valid org project URL', () => {
    expect(isValidGitHubProjectUrl('https://github.com/orgs/acme/projects/12')).toBe(true);
  });

  it('returns false for invalid URL', () => {
    expect(isValidGitHubProjectUrl('not-a-url')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidGitHubProjectUrl('')).toBe(false);
  });
});
