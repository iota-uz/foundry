/**
 * Tests for context-builders - environment variable parsing.
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import {
  buildDispatchContext,
  buildIssueProcessorContext,
  getRuntimeConfig,
} from '../context-builders';
import { ENV, DEFAULTS } from '../../constants';

describe('context-builders', () => {
  // Store original env vars to restore after tests
  const originalEnv: Record<string, string | undefined> = {};
  const envVarsToRestore = [
    ENV.GITHUB_TOKEN,
    ENV.GITHUB_REPOSITORY,
    ENV.GRAPH_SOURCE,
    ENV.GRAPH_LABEL,
    ENV.GRAPH_PROJECT_OWNER,
    ENV.GRAPH_PROJECT_NUMBER,
    ENV.GRAPH_READY_STATUS,
    ENV.GRAPH_IN_PROGRESS_STATUS,
    ENV.GRAPH_MAX_CONCURRENT,
    ENV.GRAPH_DRY_RUN,
    ENV.GRAPH_ISSUE_NUMBER,
    ENV.GRAPH_BASE_BRANCH,
    ENV.GRAPH_DONE_STATUS,
    ENV.GRAPH_STATE_DIR,
    ENV.GRAPH_VERBOSE,
    ENV.GRAPH_OUTPUT_FILE,
    ENV.GRAPH_PRIORITY_FIELD,
    ENV.GITHUB_RUN_ID,
    ENV.GITHUB_SERVER_URL,
  ];

  beforeEach(() => {
    // Save original values
    for (const key of envVarsToRestore) {
      originalEnv[key] = process.env[key];
    }
    // Clear all test env vars
    for (const key of envVarsToRestore) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore original values
    for (const key of envVarsToRestore) {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  describe('buildDispatchContext', () => {
    it('should build context with required env vars', () => {
      process.env[ENV.GITHUB_TOKEN] = 'test-token';
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';

      const context = buildDispatchContext();

      expect(context.token).toBe('test-token');
      expect(context.owner).toBe('owner');
      expect(context.repo).toBe('repo');
      expect(context.sourceType).toBe(DEFAULTS.SOURCE);
      expect(context.label).toBe(DEFAULTS.LABEL);
      expect(context.readyStatus).toBe(DEFAULTS.READY_STATUS);
      expect(context.inProgressStatus).toBe(DEFAULTS.IN_PROGRESS_STATUS);
    });

    it('should throw when GITHUB_TOKEN is missing', () => {
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';

      expect(() => buildDispatchContext()).toThrow(`${ENV.GITHUB_TOKEN} environment variable is required`);
    });

    it('should throw when GITHUB_REPOSITORY is missing', () => {
      process.env[ENV.GITHUB_TOKEN] = 'test-token';

      expect(() => buildDispatchContext()).toThrow(`${ENV.GITHUB_REPOSITORY} environment variable is required`);
    });

    it('should throw on invalid GITHUB_REPOSITORY format', () => {
      process.env[ENV.GITHUB_TOKEN] = 'test-token';
      process.env[ENV.GITHUB_REPOSITORY] = 'invalid-format';

      expect(() => buildDispatchContext()).toThrow('Invalid GITHUB_REPOSITORY format');
    });

    it('should use custom values when provided', () => {
      process.env[ENV.GITHUB_TOKEN] = 'test-token';
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';
      process.env[ENV.GRAPH_SOURCE] = 'project';
      process.env[ENV.GRAPH_LABEL] = 'custom-label';
      process.env[ENV.GRAPH_PROJECT_OWNER] = 'project-owner';
      process.env[ENV.GRAPH_PROJECT_NUMBER] = '42';
      process.env[ENV.GRAPH_READY_STATUS] = 'Custom Ready';
      process.env[ENV.GRAPH_IN_PROGRESS_STATUS] = 'Working';
      process.env[ENV.GRAPH_MAX_CONCURRENT] = '5';
      process.env[ENV.GRAPH_DRY_RUN] = 'true';

      const context = buildDispatchContext();

      expect(context.sourceType).toBe('project');
      expect(context.label).toBe('custom-label');
      expect(context.projectOwner).toBe('project-owner');
      expect(context.projectNumber).toBe(42);
      expect(context.readyStatus).toBe('Custom Ready');
      expect(context.inProgressStatus).toBe('Working');
      expect(context.maxConcurrent).toBe(5);
      expect(context.dryRun).toBe(true);
    });

    it('should throw when project source is used without project number', () => {
      process.env[ENV.GITHUB_TOKEN] = 'test-token';
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';
      process.env[ENV.GRAPH_SOURCE] = 'project';

      expect(() => buildDispatchContext()).toThrow(`${ENV.GRAPH_PROJECT_NUMBER} is required for project source`);
    });
  });

  describe('buildIssueProcessorContext', () => {
    it('should build context with required env vars', () => {
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';
      process.env[ENV.GRAPH_ISSUE_NUMBER] = '123';

      const context = buildIssueProcessorContext();

      expect(context.issueNumber).toBe(123);
      expect(context.repository).toBe('owner/repo');
      expect(context.baseBranch).toBe(DEFAULTS.BASE_BRANCH);
      expect(context.currentTaskIndex).toBe(0);
      expect(context.testsPassed).toBe(false);
      expect(context.allTasksComplete).toBe(false);
      expect(context.fixAttempts).toBe(0);
      expect(context.maxFixAttempts).toBe(DEFAULTS.MAX_FIX_ATTEMPTS);
    });

    it('should throw when GRAPH_ISSUE_NUMBER is missing', () => {
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';

      expect(() => buildIssueProcessorContext()).toThrow(`${ENV.GRAPH_ISSUE_NUMBER} environment variable is required`);
    });

    it('should throw when GITHUB_REPOSITORY is missing', () => {
      process.env[ENV.GRAPH_ISSUE_NUMBER] = '123';

      expect(() => buildIssueProcessorContext()).toThrow(`${ENV.GITHUB_REPOSITORY} environment variable is required`);
    });

    it('should use custom values when provided', () => {
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';
      process.env[ENV.GRAPH_ISSUE_NUMBER] = '456';
      process.env[ENV.GRAPH_BASE_BRANCH] = 'develop';
      process.env[ENV.GRAPH_PROJECT_OWNER] = 'project-owner';
      process.env[ENV.GRAPH_PROJECT_NUMBER] = '10';
      process.env[ENV.GRAPH_DONE_STATUS] = 'Completed';

      const context = buildIssueProcessorContext();

      expect(context.issueNumber).toBe(456);
      expect(context.baseBranch).toBe('develop');
      expect(context.projectOwner).toBe('project-owner');
      expect(context.projectNumber).toBe(10);
      expect(context.doneStatus).toBe('Completed');
    });

    it('should build actions run URL when GitHub Actions env vars are present', () => {
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';
      process.env[ENV.GRAPH_ISSUE_NUMBER] = '123';
      process.env[ENV.GITHUB_RUN_ID] = '12345';
      process.env[ENV.GITHUB_SERVER_URL] = 'https://github.com';

      const context = buildIssueProcessorContext();

      expect(context.actionsRunUrl).toBe('https://github.com/owner/repo/actions/runs/12345');
    });

    it('should not include actions run URL when env vars are incomplete', () => {
      process.env[ENV.GITHUB_REPOSITORY] = 'owner/repo';
      process.env[ENV.GRAPH_ISSUE_NUMBER] = '123';
      process.env[ENV.GITHUB_RUN_ID] = '12345';
      // Missing GITHUB_SERVER_URL

      const context = buildIssueProcessorContext();

      expect(context.actionsRunUrl).toBeUndefined();
    });
  });

  describe('getRuntimeConfig', () => {
    it('should return default values when no env vars set', () => {
      const config = getRuntimeConfig();

      expect(config.stateDir).toBe(DEFAULTS.STATE_DIR);
      expect(config.verbose).toBe(false);
      expect(config.outputFile).toBeUndefined();
    });

    it('should use custom values when provided', () => {
      process.env[ENV.GRAPH_STATE_DIR] = '/custom/state/dir';
      process.env[ENV.GRAPH_VERBOSE] = 'true';
      process.env[ENV.GRAPH_OUTPUT_FILE] = '/output/matrix.json';

      const config = getRuntimeConfig();

      expect(config.stateDir).toBe('/custom/state/dir');
      expect(config.verbose).toBe(true);
      expect(config.outputFile).toBe('/output/matrix.json');
    });

    it('should not set verbose for non-true values', () => {
      process.env[ENV.GRAPH_VERBOSE] = 'false';
      expect(getRuntimeConfig().verbose).toBe(false);

      process.env[ENV.GRAPH_VERBOSE] = '1';
      expect(getRuntimeConfig().verbose).toBe(false);

      process.env[ENV.GRAPH_VERBOSE] = 'yes';
      expect(getRuntimeConfig().verbose).toBe(false);
    });
  });
});
