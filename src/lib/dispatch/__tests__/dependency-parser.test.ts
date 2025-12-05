/**
 * Tests for the dependency parser
 */

import { describe, expect, it } from 'bun:test';
import {
  parseDependencies,
  parseIssueReferences,
  formatDependencyRef,
  dependencyRefsEqual,
  createDependencyRef,
  parseDependencyRefString,
} from '../dependency-parser';

describe('dependency-parser', () => {
  const defaultOwner = 'iota-uz';
  const defaultRepo = 'foundry';

  describe('parseDependencies', () => {
    it('should parse "Depends on #123" format', () => {
      const body = 'This issue depends on #123';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(1);
      expect(deps[0]).toEqual({
        owner: defaultOwner,
        repo: defaultRepo,
        number: 123,
      });
    });

    it('should parse "Depends on owner/repo#123" format', () => {
      const body = 'This issue depends on other-org/other-repo#456';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(1);
      expect(deps[0]).toEqual({
        owner: 'other-org',
        repo: 'other-repo',
        number: 456,
      });
    });

    it('should parse multiple dependencies on one line', () => {
      const body = 'Depends on #1, #2, #3';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(3);
      expect(deps[0]?.number).toBe(1);
      expect(deps[1]?.number).toBe(2);
      expect(deps[2]?.number).toBe(3);
    });

    it('should parse "Blocked by" format', () => {
      const body = 'Blocked by #789';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(1);
      expect(deps[0]?.number).toBe(789);
    });

    it('should parse "Requires" format', () => {
      const body = 'Requires #100';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(1);
      expect(deps[0]?.number).toBe(100);
    });

    it('should parse "After" format', () => {
      const body = 'After #50, #51';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(2);
      expect(deps[0]?.number).toBe(50);
      expect(deps[1]?.number).toBe(51);
    });

    it('should handle mixed formats', () => {
      const body = `
## Dependencies
- Depends on #1
- Blocked by owner/repo#2
- Requires #3
      `;
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(3);
    });

    it('should deduplicate dependencies', () => {
      const body = 'Depends on #1. Also depends on #1';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(1);
    });

    it('should handle empty body', () => {
      expect(parseDependencies('', defaultOwner, defaultRepo)).toEqual([]);
      expect(parseDependencies(null as unknown as string, defaultOwner, defaultRepo)).toEqual([]);
    });

    it('should handle body with no dependencies', () => {
      const body = 'This is a regular issue with no dependency declarations.';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toEqual([]);
    });

    it('should be case insensitive', () => {
      const body = 'DEPENDS ON #1. Blocked By #2. requires #3';
      const deps = parseDependencies(body, defaultOwner, defaultRepo);

      expect(deps).toHaveLength(3);
    });
  });

  describe('parseIssueReferences', () => {
    it('should parse bare issue number', () => {
      const refs = parseIssueReferences('#123', defaultOwner, defaultRepo);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        owner: defaultOwner,
        repo: defaultRepo,
        number: 123,
      });
    });

    it('should parse owner/repo#number format', () => {
      const refs = parseIssueReferences('org/project#456', defaultOwner, defaultRepo);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        owner: 'org',
        repo: 'project',
        number: 456,
      });
    });

    it('should parse multiple references', () => {
      const refs = parseIssueReferences('#1, org/repo#2, #3', defaultOwner, defaultRepo);

      expect(refs).toHaveLength(3);
    });

    it('should handle GitHub URL format', () => {
      const refs = parseIssueReferences(
        'https://github.com/owner/repo#123',
        defaultOwner,
        defaultRepo
      );

      expect(refs).toHaveLength(1);
      expect(refs[0]?.owner).toBe('owner');
      expect(refs[0]?.repo).toBe('repo');
      expect(refs[0]?.number).toBe(123);
    });
  });

  describe('formatDependencyRef', () => {
    it('should format reference correctly', () => {
      const ref = { owner: 'iota-uz', repo: 'foundry', number: 123 };
      expect(formatDependencyRef(ref)).toBe('iota-uz/foundry#123');
    });
  });

  describe('dependencyRefsEqual', () => {
    it('should return true for equal references', () => {
      const a = { owner: 'iota-uz', repo: 'foundry', number: 123 };
      const b = { owner: 'iota-uz', repo: 'foundry', number: 123 };
      expect(dependencyRefsEqual(a, b)).toBe(true);
    });

    it('should return false for different numbers', () => {
      const a = { owner: 'iota-uz', repo: 'foundry', number: 123 };
      const b = { owner: 'iota-uz', repo: 'foundry', number: 456 };
      expect(dependencyRefsEqual(a, b)).toBe(false);
    });

    it('should be case insensitive for owner and repo', () => {
      const a = { owner: 'IOTA-UZ', repo: 'FOUNDRY', number: 123 };
      const b = { owner: 'iota-uz', repo: 'foundry', number: 123 };
      expect(dependencyRefsEqual(a, b)).toBe(true);
    });
  });

  describe('createDependencyRef', () => {
    it('should create a dependency reference', () => {
      const ref = createDependencyRef('owner', 'repo', 123);
      expect(ref).toEqual({ owner: 'owner', repo: 'repo', number: 123 });
    });
  });

  describe('parseDependencyRefString', () => {
    it('should parse bare issue number', () => {
      const ref = parseDependencyRefString('#123', defaultOwner, defaultRepo);
      expect(ref).toEqual({ owner: defaultOwner, repo: defaultRepo, number: 123 });
    });

    it('should parse full reference', () => {
      const ref = parseDependencyRefString('org/project#456', defaultOwner, defaultRepo);
      expect(ref).toEqual({ owner: 'org', repo: 'project', number: 456 });
    });

    it('should return null for invalid string', () => {
      const ref = parseDependencyRefString('not a reference', defaultOwner, defaultRepo);
      expect(ref).toBeNull();
    });
  });
});
