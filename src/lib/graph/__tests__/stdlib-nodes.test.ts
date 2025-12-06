/**
 * Tests for the stdlib nodes - AgentNode, CommandNode, SlashCommandNode
 */

import { describe, expect, it } from 'bun:test';
import {
  AgentNodeRuntime,
  CommandNodeRuntime,
  SlashCommandNodeRuntime,
  createAgentNode,
  createCommandNode,
  createSlashCommandNode,
  NodeExecutionError,
  isInlineToolDefinition,
} from '../nodes';
import type { WorkflowState } from '../types';
import { z } from 'zod';

// Helper to create a mock workflow state
const createMockState = <T extends Record<string, unknown>>(context: T): WorkflowState<T> => ({
  currentNode: 'TEST',
  status: 'running',
  updatedAt: new Date().toISOString(),
  conversationHistory: [],
  context,
});

describe('stdlib-nodes', () => {
  describe('isInlineToolDefinition', () => {
    it('should return true for inline tool definitions', () => {
      const inlineTool = {
        name: 'my_tool',
        schema: z.object({ input: z.string() }),
        execute: async () => ({}),
      };
      expect(isInlineToolDefinition(inlineTool)).toBe(true);
    });

    it('should return false for string tool references', () => {
      expect(isInlineToolDefinition('read_file')).toBe(false);
    });
  });

  describe('AgentNodeRuntime', () => {
    it('should create an agent node with correct nodeType', () => {
      const node = new AgentNodeRuntime({
        role: 'architect',
        system: 'You are a planner',
        next: 'IMPLEMENT',
      });

      expect(node.nodeType).toBe('agent');
    });

    it('should resolve static transitions', () => {
      const node = new AgentNodeRuntime({
        role: 'architect',
        system: 'You are a planner',
        next: 'IMPLEMENT',
      });

      const state = createMockState({ done: false });
      expect(node.resolveNext(state)).toBe('IMPLEMENT');
    });

    it('should resolve dynamic transitions', () => {
      const node = new AgentNodeRuntime<{ done: boolean }>({
        role: 'architect',
        system: 'You are a planner',
        next: (state) => (state.context.done ? 'END' : 'IMPLEMENT'),
      });

      expect(node.resolveNext(createMockState({ done: false }))).toBe('IMPLEMENT');
      expect(node.resolveNext(createMockState({ done: true }))).toBe('END');
    });
  });

  describe('createAgentNode', () => {
    it('should create agent node config', () => {
      const config = createAgentNode({
        role: 'developer',
        system: 'You build',
        tools: ['read_file', 'write_file'],
        next: 'TEST',
      });

      expect(config.role).toBe('developer');
      expect(config.system).toBe('You build');
      expect(config.tools).toEqual(['read_file', 'write_file']);
      expect(config.next).toBe('TEST');
    });
  });

  describe('CommandNodeRuntime', () => {
    it('should create a command node with correct nodeType', () => {
      const node = new CommandNodeRuntime({
        command: 'echo hello',
        next: 'END',
      });

      expect(node.nodeType).toBe('command');
    });

    it('should resolve static transitions', () => {
      const node = new CommandNodeRuntime({
        command: 'echo hello',
        next: 'END',
      });

      const state = createMockState({});
      expect(node.resolveNext(state)).toBe('END');
    });

    it('should resolve dynamic transitions', () => {
      const node = new CommandNodeRuntime<{ success: boolean }>({
        command: 'npm test',
        next: (state) => (state.context.success ? 'DEPLOY' : 'FIX'),
      });

      expect(node.resolveNext(createMockState({ success: true }))).toBe('DEPLOY');
      expect(node.resolveNext(createMockState({ success: false }))).toBe('FIX');
    });
  });

  describe('createCommandNode', () => {
    it('should create command node config', () => {
      const config = createCommandNode({
        command: 'gh pr create --fill',
        next: 'END',
      });

      expect(config.command).toBe('gh pr create --fill');
      expect(config.next).toBe('END');
    });
  });

  describe('SlashCommandNodeRuntime', () => {
    it('should create a slash-command node with correct nodeType', () => {
      const node = new SlashCommandNodeRuntime({
        command: 'edit',
        args: 'Add error handling',
        next: 'TEST',
      });

      expect(node.nodeType).toBe('slash-command');
    });

    it('should resolve static transitions', () => {
      const node = new SlashCommandNodeRuntime({
        command: 'test',
        args: 'src/*.test.ts',
        next: 'DEPLOY',
      });

      const state = createMockState({});
      expect(node.resolveNext(state)).toBe('DEPLOY');
    });

    it('should resolve dynamic transitions', () => {
      const node = new SlashCommandNodeRuntime<{ testsPassed: boolean }>({
        command: 'test',
        args: 'all tests',
        next: (state) => (state.context.testsPassed ? 'SUBMIT' : 'FIX'),
      });

      expect(node.resolveNext(createMockState({ testsPassed: true }))).toBe('SUBMIT');
      expect(node.resolveNext(createMockState({ testsPassed: false }))).toBe('FIX');
    });
  });

  describe('createSlashCommandNode', () => {
    it('should create slash-command node config', () => {
      const config = createSlashCommandNode({
        command: 'edit',
        args: 'Fix the bug in src/utils.ts',
        next: 'TEST',
      });

      expect(config.command).toBe('edit');
      expect(config.args).toBe('Fix the bug in src/utils.ts');
      expect(config.next).toBe('TEST');
    });
  });

  describe('NodeExecutionError', () => {
    it('should create error with all properties', () => {
      const cause = new Error('Root cause');
      const error = new NodeExecutionError(
        'Node failed',
        'TEST_NODE',
        'agent',
        cause,
        { detail: 'info' }
      );

      expect(error.message).toBe('Node failed');
      expect(error.nodeName).toBe('TEST_NODE');
      expect(error.nodeType).toBe('agent');
      expect(error.cause).toBe(cause);
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.name).toBe('NodeExecutionError');
    });
  });
});
