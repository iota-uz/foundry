/**
 * Tests for the dispatcher and matrix generation
 */

import { describe, expect, it } from 'bun:test';
import { generateMatrix, formatResultSummary } from '../dispatcher';
import type { ResolvedIssue, DispatchResult, QueuedIssue, PriorityLevel } from '../types';
import { getPriorityScore } from '../dag-builder';

// Helper to create mock issues
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
    subIssueNumbers: opts.subIssueNumbers ?? [],
    parentIssueNumber: opts.parentIssueNumber ?? null,
  };
}

function createMockResolved(
  number: number,
  priority: PriorityLevel = 'none',
  title?: string,
  opts: { isLeaf?: boolean; parentIssueNumber?: number | null; subIssueNumbers?: number[] } = {}
): ResolvedIssue {
  const issue = createMockIssue(number, {
    title: title ?? `Issue #${number}`,
    parentIssueNumber: opts.parentIssueNumber ?? null,
    subIssueNumbers: opts.subIssueNumbers ?? [],
  });
  return {
    issue,
    status: 'READY',
    dependencies: [],
    blockedBy: [],
    priority,
    priorityScore: getPriorityScore(priority),
    isLeaf: opts.isLeaf ?? true,
  };
}

describe('dispatcher', () => {
  describe('generateMatrix', () => {
    const config = {
      token: 'token',
      owner: 'iota-uz',
      repo: 'foundry',
    };

    it('should generate empty matrix for no issues', () => {
      const matrix = generateMatrix([], config);

      expect(matrix.include).toEqual([]);
    });

    it('should generate matrix entries for ready issues', () => {
      const issues = [
        createMockResolved(1, 'high', 'High priority issue'),
        createMockResolved(2, 'low', 'Low priority issue'),
      ];

      const matrix = generateMatrix(issues, config);

      expect(matrix.include).toHaveLength(2);
      
      // Should be sorted by priority
      expect(matrix.include[0]?.issue_number).toBe(1);
      expect(matrix.include[0]?.priority).toBe('high');
      expect(matrix.include[0]?.title).toBe('High priority issue');
      expect(matrix.include[0]?.repository).toBe('iota-uz/foundry');

      expect(matrix.include[1]?.issue_number).toBe(2);
      expect(matrix.include[1]?.priority).toBe('low');
    });

    it('should include all required matrix fields', () => {
      const issues = [createMockResolved(123, 'critical')];
      const matrix = generateMatrix(issues, config);

      const entry = matrix.include[0];
      expect(entry).toBeDefined();
      expect(entry?.issue_number).toBe(123);
      expect(entry?.title).toBeDefined();
      expect(entry?.priority).toBe('critical');
      expect(entry?.priority_score).toBe(0);
      expect(entry?.repository).toBe('iota-uz/foundry');
      expect(entry?.url).toContain('github.com');
    });
  });

  describe('formatResultSummary', () => {
    it('should format result with ready issues', () => {
      const result: DispatchResult = {
        totalIssues: 5,
        readyIssues: [
          createMockResolved(1, 'high', 'Ready issue 1'),
          createMockResolved(2, 'medium', 'Ready issue 2'),
        ],
        blockedIssues: [],
        cycleWarnings: [],
        matrix: {
          include: [
            {
              issue_number: 1,
              title: 'Ready issue 1',
              priority: 'high',
              priority_score: 1,
              repository: 'owner/repo',
              url: 'https://github.com/owner/repo/issues/1',
            },
          ],
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        dryRun: false,
      };

      const summary = formatResultSummary(result);

      expect(summary).toContain('DISPATCH SUMMARY');
      expect(summary).toContain('Total Issues: 5');
      expect(summary).toContain('Ready Leaf Issues: 2');
      expect(summary).toContain('READY FOR EXECUTION (leaf issues only)');
      expect(summary).toContain('Ready issue 1');
    });

    it('should format result with blocked issues', () => {
      const blockedIssue = createMockResolved(3, 'none', 'Blocked issue');
      blockedIssue.status = 'BLOCKED';
      blockedIssue.blockedBy = [
        { owner: 'owner', repo: 'repo', number: 1 },
      ];

      const result: DispatchResult = {
        totalIssues: 2,
        readyIssues: [],
        blockedIssues: [blockedIssue],
        cycleWarnings: [],
        matrix: { include: [] },
        timestamp: '2024-01-01T00:00:00.000Z',
        dryRun: false,
      };

      const summary = formatResultSummary(result);

      expect(summary).toContain('BLOCKED ISSUES');
      expect(summary).toContain('Blocked issue');
      expect(summary).toContain('Blocked by: owner/repo#1');
    });

    it('should format result with cycle warnings', () => {
      const result: DispatchResult = {
        totalIssues: 2,
        readyIssues: [],
        blockedIssues: [],
        cycleWarnings: [
          {
            hasCycle: true,
            cycleNodes: ['owner/repo#1', 'owner/repo#2', 'owner/repo#1'],
            description: 'Circular dependency: #1 -> #2 -> #1',
          },
        ],
        matrix: { include: [] },
        timestamp: '2024-01-01T00:00:00.000Z',
        dryRun: false,
      };

      const summary = formatResultSummary(result);

      expect(summary).toContain('CYCLE WARNINGS');
      expect(summary).toContain('Circular dependency');
    });

    it('should include dry run indicator', () => {
      const result: DispatchResult = {
        totalIssues: 0,
        readyIssues: [],
        blockedIssues: [],
        cycleWarnings: [],
        matrix: { include: [] },
        timestamp: '2024-01-01T00:00:00.000Z',
        dryRun: true,
      };

      const summary = formatResultSummary(result);

      expect(summary).toContain('Dry Run: true');
    });

    it('should include matrix JSON output', () => {
      const result: DispatchResult = {
        totalIssues: 1,
        readyIssues: [createMockResolved(1)],
        blockedIssues: [],
        cycleWarnings: [],
        matrix: {
          include: [
            {
              issue_number: 1,
              title: 'Test',
              priority: 'none',
              priority_score: 4,
              repository: 'owner/repo',
              url: 'https://github.com/owner/repo/issues/1',
            },
          ],
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        dryRun: false,
      };

      const summary = formatResultSummary(result);

      expect(summary).toContain('MATRIX OUTPUT');
      expect(summary).toContain('"include"');
      expect(summary).toContain('"issue_number": 1');
    });
  });

  describe('sub-issues support', () => {
    const config = {
      token: 'token',
      owner: 'iota-uz',
      repo: 'foundry',
    };

    it('should include parent_issue_number in matrix entries', () => {
      const childIssue = createMockResolved(11, 'high', 'Child issue', {
        isLeaf: true,
        parentIssueNumber: 10,
      });

      const matrix = generateMatrix([childIssue], config);

      expect(matrix.include).toHaveLength(1);
      expect(matrix.include[0]?.parent_issue_number).toBe(10);
    });

    it('should set parent_issue_number to null for root issues', () => {
      const rootIssue = createMockResolved(1, 'none', 'Root issue', {
        isLeaf: true,
        parentIssueNumber: null,
      });

      const matrix = generateMatrix([rootIssue], config);

      expect(matrix.include[0]?.parent_issue_number).toBeNull();
    });

    it('should format sub-issues with parent info in summary', () => {
      const childIssue = createMockResolved(11, 'high', 'Child task', {
        isLeaf: true,
        parentIssueNumber: 10,
      });

      const result: DispatchResult = {
        totalIssues: 2,
        readyIssues: [childIssue],
        blockedIssues: [],
        cycleWarnings: [],
        matrix: {
          include: [
            {
              issue_number: 11,
              title: 'Child task',
              priority: 'high',
              priority_score: 1,
              repository: 'owner/repo',
              url: 'https://github.com/owner/repo/issues/11',
              parent_issue_number: 10,
            },
          ],
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        dryRun: false,
      };

      const summary = formatResultSummary(result);

      expect(summary).toContain('(child of #10)');
    });

    it('should mark parent issues as PARENT in blocked list', () => {
      const parentIssue = createMockResolved(10, 'none', 'Parent epic', {
        isLeaf: false,
        subIssueNumbers: [11, 12],
      });
      parentIssue.status = 'BLOCKED';
      parentIssue.blockedBy = [
        { owner: 'owner', repo: 'repo', number: 11 },
        { owner: 'owner', repo: 'repo', number: 12 },
      ];

      const result: DispatchResult = {
        totalIssues: 3,
        readyIssues: [],
        blockedIssues: [parentIssue],
        cycleWarnings: [],
        matrix: { include: [] },
        timestamp: '2024-01-01T00:00:00.000Z',
        dryRun: false,
      };

      const summary = formatResultSummary(result);

      expect(summary).toContain('[PARENT]');
      expect(summary).toContain('Parent epic');
    });
  });
});
