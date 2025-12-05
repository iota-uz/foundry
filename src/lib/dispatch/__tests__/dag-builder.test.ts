/**
 * Tests for the DAG builder
 */

import { describe, expect, it } from 'bun:test';
import {
  extractPriority,
  getPriorityScore,
  sortByPriority,
  applyMaxConcurrent,
  createIssueId,
  dependencyRefToId,
  formatBlockedBy,
} from '../dag-builder';
import type { ResolvedIssue, QueuedIssue, PriorityLevel } from '../types';

// Helper to create a mock QueuedIssue
function createMockIssue(
  number: number,
  opts: Partial<QueuedIssue> = {}
): QueuedIssue {
  return {
    number,
    title: opts.title ?? `Issue #${number}`,
    body: opts.body ?? '',
    state: opts.state ?? 'open',
    labels: opts.labels ?? [],
    createdAt: opts.createdAt ?? new Date().toISOString(),
    updatedAt: opts.updatedAt ?? new Date().toISOString(),
    htmlUrl: opts.htmlUrl ?? `https://github.com/owner/repo/issues/${number}`,
    owner: opts.owner ?? 'owner',
    repo: opts.repo ?? 'repo',
  };
}

// Helper to create a mock ResolvedIssue
function createMockResolved(
  number: number,
  priority: PriorityLevel = 'none',
  createdAt?: string
): ResolvedIssue {
  const opts: Partial<QueuedIssue> = {};
  if (createdAt !== undefined) {
    opts.createdAt = createdAt;
  }
  const issue = createMockIssue(number, opts);
  return {
    issue,
    status: 'READY',
    dependencies: [],
    blockedBy: [],
    priority,
    priorityScore: getPriorityScore(priority),
  };
}

describe('dag-builder', () => {
  describe('createIssueId', () => {
    it('should create correct ID format', () => {
      expect(createIssueId('iota-uz', 'foundry', 123)).toBe('iota-uz/foundry#123');
    });
  });

  describe('dependencyRefToId', () => {
    it('should convert dependency ref to ID', () => {
      const ref = { owner: 'iota-uz', repo: 'foundry', number: 456 };
      expect(dependencyRefToId(ref)).toBe('iota-uz/foundry#456');
    });
  });

  describe('extractPriority', () => {
    it('should extract critical priority', () => {
      expect(extractPriority(['priority:critical', 'bug'])).toBe('critical');
    });

    it('should extract high priority', () => {
      expect(extractPriority(['priority:high', 'enhancement'])).toBe('high');
    });

    it('should extract medium priority', () => {
      expect(extractPriority(['priority:medium'])).toBe('medium');
    });

    it('should extract low priority', () => {
      expect(extractPriority(['priority:low'])).toBe('low');
    });

    it('should return none for no priority label', () => {
      expect(extractPriority(['bug', 'enhancement'])).toBe('none');
    });

    it('should return none for empty labels', () => {
      expect(extractPriority([])).toBe('none');
    });

    it('should be case insensitive', () => {
      expect(extractPriority(['PRIORITY:HIGH'])).toBe('high');
    });
  });

  describe('getPriorityScore', () => {
    it('should return correct scores', () => {
      expect(getPriorityScore('critical')).toBe(0);
      expect(getPriorityScore('high')).toBe(1);
      expect(getPriorityScore('medium')).toBe(2);
      expect(getPriorityScore('low')).toBe(3);
      expect(getPriorityScore('none')).toBe(4);
    });
  });

  describe('sortByPriority', () => {
    it('should sort by priority score (critical first)', () => {
      const issues = [
        createMockResolved(1, 'low'),
        createMockResolved(2, 'critical'),
        createMockResolved(3, 'high'),
      ];

      const sorted = sortByPriority(issues);

      expect(sorted[0]?.issue.number).toBe(2); // critical
      expect(sorted[1]?.issue.number).toBe(3); // high
      expect(sorted[2]?.issue.number).toBe(1); // low
    });

    it('should use FIFO for same priority', () => {
      const baseDate = new Date('2024-01-01T00:00:00Z');
      const issues = [
        createMockResolved(1, 'high', new Date(baseDate.getTime() + 2000).toISOString()),
        createMockResolved(2, 'high', new Date(baseDate.getTime() + 1000).toISOString()),
        createMockResolved(3, 'high', new Date(baseDate.getTime()).toISOString()),
      ];

      const sorted = sortByPriority(issues);

      expect(sorted[0]?.issue.number).toBe(3); // oldest
      expect(sorted[1]?.issue.number).toBe(2);
      expect(sorted[2]?.issue.number).toBe(1); // newest
    });

    it('should not modify original array', () => {
      const issues = [
        createMockResolved(1, 'low'),
        createMockResolved(2, 'critical'),
      ];

      sortByPriority(issues);

      expect(issues[0]?.issue.number).toBe(1); // unchanged
    });
  });

  describe('applyMaxConcurrent', () => {
    it('should limit results to maxConcurrent', () => {
      const issues = [
        createMockResolved(1, 'high'),
        createMockResolved(2, 'high'),
        createMockResolved(3, 'high'),
        createMockResolved(4, 'high'),
        createMockResolved(5, 'high'),
      ];

      const limited = applyMaxConcurrent(issues, 3);

      expect(limited).toHaveLength(3);
    });

    it('should sort by priority before limiting', () => {
      const issues = [
        createMockResolved(1, 'low'),
        createMockResolved(2, 'critical'),
        createMockResolved(3, 'high'),
      ];

      const limited = applyMaxConcurrent(issues, 2);

      expect(limited).toHaveLength(2);
      expect(limited[0]?.issue.number).toBe(2); // critical
      expect(limited[1]?.issue.number).toBe(3); // high
    });

    it('should return all issues if maxConcurrent is undefined', () => {
      const issues = [
        createMockResolved(1),
        createMockResolved(2),
        createMockResolved(3),
      ];

      const result = applyMaxConcurrent(issues, undefined);

      expect(result).toHaveLength(3);
    });

    it('should return all issues if maxConcurrent is 0', () => {
      const issues = [
        createMockResolved(1),
        createMockResolved(2),
      ];

      const result = applyMaxConcurrent(issues, 0);

      expect(result).toHaveLength(2);
    });
  });

  describe('formatBlockedBy', () => {
    it('should format multiple blocking refs', () => {
      const refs = [
        { owner: 'owner', repo: 'repo', number: 1 },
        { owner: 'other', repo: 'project', number: 2 },
      ];

      expect(formatBlockedBy(refs)).toBe('owner/repo#1, other/project#2');
    });

    it('should return "none" for empty array', () => {
      expect(formatBlockedBy([])).toBe('none');
    });
  });
});
