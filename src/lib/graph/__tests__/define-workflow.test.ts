/**
 * Tests for the define-workflow module
 */

import { describe, expect, it } from 'bun:test';
import {
  defineWorkflow,
  nodes,
  AgentNode,
  CommandNode,
  SlashCommandNode,
  createInitialState,
} from '../define-workflow';

describe('define-workflow', () => {
  describe('nodes.AgentNode', () => {
    it('should create an agent node definition', () => {
      const node = nodes.AgentNode({
        role: 'architect',
        system: 'You are a planner',
        tools: ['list_files'],
        next: 'IMPLEMENT',
      });

      expect(node.type).toBe('agent');
      expect(node.role).toBe('architect');
      expect(node.system).toBe('You are a planner');
      expect(node.tools).toEqual(['list_files']);
      expect(node.next).toBe('IMPLEMENT');
    });

    it('should support dynamic transitions', () => {
      const node = nodes.AgentNode<{ done: boolean }>({
        role: 'worker',
        system: 'You work',
        next: (state) => (state.context.done ? 'END' : 'WORK'),
      });

      expect(typeof node.next).toBe('function');
    });
  });

  describe('nodes.CommandNode', () => {
    it('should create a command node definition', () => {
      const node = nodes.CommandNode({
        command: 'gh pr create --fill',
        next: 'END',
      });

      expect(node.type).toBe('command');
      expect(node.command).toBe('gh pr create --fill');
      expect(node.next).toBe('END');
    });
  });

  describe('nodes.SlashCommandNode', () => {
    it('should create a slash-command node definition', () => {
      const node = nodes.SlashCommandNode({
        command: 'edit',
        args: 'Add error handling to src/utils.ts',
        next: 'TEST',
      });

      expect(node.type).toBe('slash-command');
      expect(node.command).toBe('edit');
      expect(node.args).toBe('Add error handling to src/utils.ts');
      expect(node.next).toBe('TEST');
    });

    it('should support dynamic transitions', () => {
      const node = nodes.SlashCommandNode<{ success: boolean }>({
        command: 'test',
        args: 'all tests',
        next: (state) => (state.context.success ? 'DEPLOY' : 'FIX'),
      });

      expect(node.type).toBe('slash-command');
      expect(typeof node.next).toBe('function');
    });
  });

  describe('AgentNode (direct export)', () => {
    it('should be the same as nodes.AgentNode', () => {
      expect(AgentNode).toBe(nodes.AgentNode);
    });
  });

  describe('CommandNode (direct export)', () => {
    it('should be the same as nodes.CommandNode', () => {
      expect(CommandNode).toBe(nodes.CommandNode);
    });
  });

  describe('SlashCommandNode (direct export)', () => {
    it('should be the same as nodes.SlashCommandNode', () => {
      expect(SlashCommandNode).toBe(nodes.SlashCommandNode);
    });
  });

  describe('defineWorkflow', () => {
    it('should return the config as-is for valid input', () => {
      const config = {
        id: 'test-workflow',
        nodes: {
          PLAN: nodes.AgentNode({
            role: 'architect',
            system: 'You plan',
            next: 'END',
          }),
        },
      };

      const result = defineWorkflow(config);
      expect(result).toBe(config);
    });

    it('should throw for missing id', () => {
      expect(() => {
        defineWorkflow({
          id: '',
          nodes: {
            PLAN: nodes.AgentNode({
              role: 'test',
              system: 'test',
              next: 'END',
            }),
          },
        });
      }).toThrow(/id/i);
    });

    it('should throw for missing nodes', () => {
      expect(() => {
        defineWorkflow({
          id: 'test',
          nodes: {},
        });
      }).toThrow(/at least one node/i);
    });

    it('should throw for node without type', () => {
      expect(() => {
        defineWorkflow({
          id: 'test',
          nodes: {
            // @ts-expect-error - intentionally invalid
            PLAN: { next: 'END' },
          },
        });
      }).toThrow(/type/i);
    });

    it('should throw for AgentNode without role', () => {
      expect(() => {
        defineWorkflow({
          id: 'test',
          nodes: {
            // @ts-expect-error - intentionally invalid
            PLAN: { type: 'agent', system: 'test', next: 'END' },
          },
        });
      }).toThrow(/role/i);
    });

    it('should throw for AgentNode without system', () => {
      expect(() => {
        defineWorkflow({
          id: 'test',
          nodes: {
            // @ts-expect-error - intentionally invalid
            PLAN: { type: 'agent', role: 'test', next: 'END' },
          },
        });
      }).toThrow(/system/i);
    });

    it('should throw for CommandNode without command', () => {
      expect(() => {
        defineWorkflow({
          id: 'test',
          nodes: {
            // @ts-expect-error - intentionally invalid
            SUBMIT: { type: 'command', next: 'END' },
          },
        });
      }).toThrow(/command/i);
    });

    it('should throw for SlashCommandNode without command', () => {
      expect(() => {
        defineWorkflow({
          id: 'test',
          nodes: {
            // @ts-expect-error - intentionally invalid
            TEST: { type: 'slash-command', args: 'test args', next: 'END' },
          },
        });
      }).toThrow(/command/i);
    });

    it('should throw for SlashCommandNode without args', () => {
      expect(() => {
        defineWorkflow({
          id: 'test',
          nodes: {
            // @ts-expect-error - intentionally invalid
            TEST: { type: 'slash-command', command: 'test', next: 'END' },
          },
        });
      }).toThrow(/args/i);
    });

    it('should accept valid workflow with multiple nodes', () => {
      const config = defineWorkflow({
        id: 'feature-dev',
        initialState: {
          context: { issueId: 123 },
        },
        nodes: {
          PLAN: nodes.AgentNode({
            role: 'architect',
            system: 'You plan',
            tools: ['list_files'],
            next: 'IMPLEMENT',
          }),
          IMPLEMENT: nodes.AgentNode({
            role: 'developer',
            system: 'You implement',
            next: (state) => (state.context.done ? 'SUBMIT' : 'IMPLEMENT'),
          }),
          SUBMIT: nodes.CommandNode({
            command: 'gh pr create',
            next: 'END',
          }),
        },
      });

      expect(config.id).toBe('feature-dev');
      expect(Object.keys(config.nodes)).toHaveLength(3);
    });
  });

  describe('createInitialState', () => {
    it('should create initial state with defaults', () => {
      const state = createInitialState('PLAN');

      expect(state.currentNode).toBe('PLAN');
      expect(state.status).toBe('pending');
      expect(state.conversationHistory).toEqual([]);
      expect(state.context).toEqual({});
      expect(state.updatedAt).toBeDefined();
    });

    it('should create initial state with custom context', () => {
      const state = createInitialState('PLAN', { issueId: 123, priority: 'high' });

      expect(state.currentNode).toBe('PLAN');
      expect(state.context).toEqual({ issueId: 123, priority: 'high' });
    });
  });
});
