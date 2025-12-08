/**
 * Tests for GitHubPRVisualizerNode.
 */

import { describe, expect, it } from 'bun:test';
import {
  GitHubPRVisualizerNodeRuntime,
  createGitHubPRVisualizerNode,
  type GitHubPRVisualizerNodeConfig,
} from '../nodes/github/pr-visualizer-node';
import type { WorkflowState } from '../types';
import { WorkflowStatus } from '../enums';

// Helper to create a mock workflow state
const createMockState = <T extends Record<string, unknown>>(
  context: T,
  currentNode = 'BUILD'
): WorkflowState<T> => ({
  currentNode,
  status: WorkflowStatus.Running,
  updatedAt: new Date().toISOString(),
  conversationHistory: [],
  context,
});

describe('GitHubPRVisualizerNode', () => {
  describe('GitHubPRVisualizerNodeRuntime', () => {
    it('should create a node with correct nodeType', () => {
      const node = new GitHubPRVisualizerNodeRuntime({
        token: 'test-token',
        owner: 'testorg',
        repo: 'testrepo',
        prNumber: 123,
        currentTask: 'Testing',
        workflowNodes: {
          PLAN: {},
          BUILD: {},
        },
        next: 'END',
      });

      expect(node.nodeType).toBe('github-pr-visualizer');
    });

    it('should resolve static transitions', () => {
      const node = new GitHubPRVisualizerNodeRuntime({
        token: 'test-token',
        owner: 'testorg',
        repo: 'testrepo',
        prNumber: 123,
        currentTask: 'Testing',
        workflowNodes: {},
        next: 'NEXT_NODE',
      });

      const state = createMockState({});
      expect(node.resolveNext(state)).toBe('NEXT_NODE');
    });

    it('should resolve dynamic transitions', () => {
      const node = new GitHubPRVisualizerNodeRuntime<{ success: boolean }>({
        token: 'test-token',
        owner: 'testorg',
        repo: 'testrepo',
        prNumber: 123,
        currentTask: 'Testing',
        workflowNodes: {},
        next: (state) => (state.context.success ? 'SUCCESS' : 'FAILURE'),
      });

      expect(node.resolveNext(createMockState({ success: true }))).toBe('SUCCESS');
      expect(node.resolveNext(createMockState({ success: false }))).toBe('FAILURE');
    });

    it('should apply default config values', () => {
      const config: GitHubPRVisualizerNodeConfig<Record<string, unknown>> = {
        token: 'test',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {},
        next: 'END',
      };

      const node = new GitHubPRVisualizerNodeRuntime(config);

      // Access private config via type assertion for testing
      const nodeConfig = (node as unknown as { config: typeof config }).config;

      expect(nodeConfig.prNumberKey).toBe('prNumber');
      expect(nodeConfig.completedNodesKey).toBe('completedNodes');
      expect(nodeConfig.maxRetries).toBe(3);
      expect(nodeConfig.position).toBe('bottom');
      expect(nodeConfig.throwOnError).toBe(false);
      expect(nodeConfig.resultKey).toBe('lastPRVisualizerResult');
      expect(nodeConfig.title).toBe('Workflow Status');
    });
  });

  describe('createGitHubPRVisualizerNode', () => {
    it('should create node config with provided values', () => {
      const config = createGitHubPRVisualizerNode({
        token: 'token123',
        owner: 'myorg',
        repo: 'myrepo',
        prNumber: 42,
        currentTask: 'Building feature',
        retryAttempt: 2,
        maxRetries: 5,
        actionsRunUrl: 'https://example.com/actions',
        workflowNodes: {
          PLAN: { label: 'Planning' },
          BUILD: { label: 'Building' },
          QA: { label: 'Testing' },
        },
        workflowEdges: [
          { from: 'PLAN', to: 'BUILD' },
          { from: 'BUILD', to: 'QA' },
        ],
        completedNodes: ['PLAN'],
        position: 'top',
        throwOnError: true,
        next: 'DONE',
      });

      expect(config.token).toBe('token123');
      expect(config.owner).toBe('myorg');
      expect(config.repo).toBe('myrepo');
      expect(config.prNumber).toBe(42);
      expect(config.currentTask).toBe('Building feature');
      expect(config.retryAttempt).toBe(2);
      expect(config.maxRetries).toBe(5);
      expect(config.actionsRunUrl).toBe('https://example.com/actions');
      expect(config.workflowNodes).toEqual({
        PLAN: { label: 'Planning' },
        BUILD: { label: 'Building' },
        QA: { label: 'Testing' },
      });
      expect(config.workflowEdges).toHaveLength(2);
      expect(config.completedNodes).toEqual(['PLAN']);
      expect(config.position).toBe('top');
      expect(config.throwOnError).toBe(true);
      expect(config.next).toBe('DONE');
    });

    it('should support dynamic value resolvers', () => {
      interface TestContext extends Record<string, unknown> {
        taskDescription: string;
        attempt: number;
        prNum: number;
      }

      const config = createGitHubPRVisualizerNode<TestContext>({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: (state) => state.context.prNum,
        currentTask: (state) => state.context.taskDescription,
        retryAttempt: (state) => state.context.attempt,
        workflowNodes: {},
        next: 'END',
      });

      expect(typeof config.prNumber).toBe('function');
      expect(typeof config.currentTask).toBe('function');
      expect(typeof config.retryAttempt).toBe('function');

      // Test that functions work correctly
      const state = createMockState<TestContext>({
        taskDescription: 'My task',
        attempt: 3,
        prNum: 99,
      });

      const prNumberFn = config.prNumber as (state: WorkflowState<TestContext>) => number;
      const currentTaskFn = config.currentTask as (state: WorkflowState<TestContext>) => string;
      const retryAttemptFn = config.retryAttempt as (state: WorkflowState<TestContext>) => number;

      expect(prNumberFn(state)).toBe(99);
      expect(currentTaskFn(state)).toBe('My task');
      expect(retryAttemptFn(state)).toBe(3);
    });
  });

  describe('Value Resolution', () => {
    it('should read prNumber from context key', () => {
      interface TestContext extends Record<string, unknown> {
        myPrNumber: number;
      }

      const config = createGitHubPRVisualizerNode<TestContext>({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumberKey: 'myPrNumber',
        currentTask: 'Task',
        workflowNodes: {},
        next: 'END',
      });

      expect(config.prNumberKey).toBe('myPrNumber');
    });

    it('should read completedNodes from context key', () => {
      interface TestContext extends Record<string, unknown> {
        finishedSteps: string[];
      }

      const config = createGitHubPRVisualizerNode<TestContext>({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {},
        completedNodesKey: 'finishedSteps',
        next: 'END',
      });

      expect(config.completedNodesKey).toBe('finishedSteps');
    });
  });

  describe('Workflow Edges', () => {
    it('should accept explicit edge definitions', () => {
      const config = createGitHubPRVisualizerNode({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {
          PLAN: {},
          BUILD: {},
          QA: {},
          FIX: {},
        },
        workflowEdges: [
          { from: 'PLAN', to: 'BUILD' },
          { from: 'BUILD', to: 'QA' },
          { from: 'QA', to: 'FIX', label: 'failure' },
          { from: 'FIX', to: 'QA', label: 'retry' },
          { from: 'QA', to: 'END', label: 'success' },
        ],
        next: 'END',
      });

      expect(config.workflowEdges).toHaveLength(5);
      expect(config.workflowEdges![2]).toEqual({ from: 'QA', to: 'FIX', label: 'failure' });
    });
  });

  describe('Marker Configuration', () => {
    it('should support custom marker ID', () => {
      const config = createGitHubPRVisualizerNode({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {},
        markerId: 'custom-workflow-id',
        next: 'END',
      });

      expect(config.markerId).toBe('custom-workflow-id');
    });

    it('should support dynamic marker ID', () => {
      interface TestContext extends Record<string, unknown> {
        workflowId: string;
      }

      const config = createGitHubPRVisualizerNode<TestContext>({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {},
        markerId: (state) => `wf-${state.context.workflowId}`,
        next: 'END',
      });

      expect(typeof config.markerId).toBe('function');

      const state = createMockState<TestContext>({ workflowId: 'abc123' });
      const markerIdFn = config.markerId as (state: WorkflowState<TestContext>) => string;
      expect(markerIdFn(state)).toBe('wf-abc123');
    });
  });

  describe('Error Handling Configuration', () => {
    it('should default throwOnError to false', () => {
      const node = new GitHubPRVisualizerNodeRuntime({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {},
        next: 'END',
      });

      const nodeConfig = (node as unknown as { config: { throwOnError: boolean } }).config;
      expect(nodeConfig.throwOnError).toBe(false);
    });

    it('should allow throwOnError to be set to true', () => {
      const node = new GitHubPRVisualizerNodeRuntime({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {},
        throwOnError: true,
        next: 'END',
      });

      const nodeConfig = (node as unknown as { config: { throwOnError: boolean } }).config;
      expect(nodeConfig.throwOnError).toBe(true);
    });
  });

  describe('Position Configuration', () => {
    it('should default to bottom position', () => {
      const node = new GitHubPRVisualizerNodeRuntime({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {},
        next: 'END',
      });

      const nodeConfig = (node as unknown as { config: { position: string } }).config;
      expect(nodeConfig.position).toBe('bottom');
    });

    it('should allow top position', () => {
      const node = new GitHubPRVisualizerNodeRuntime({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        prNumber: 1,
        currentTask: 'Task',
        workflowNodes: {},
        position: 'top',
        next: 'END',
      });

      const nodeConfig = (node as unknown as { config: { position: string } }).config;
      expect(nodeConfig.position).toBe('top');
    });
  });
});
