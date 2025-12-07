/**
 * @sys/graph - Primitive Nodes Tests
 *
 * Tests for EvalNode, DynamicAgentNode, and DynamicCommandNode primitives.
 */

import { describe, it, expect, mock } from 'bun:test';

import {
  EvalNodeRuntime,
  DynamicAgentNodeRuntime,
  DynamicCommandNodeRuntime,
} from '../nodes/primitives';
import type { WorkflowState, GraphContext } from '../types';

// Mock context for tests
const createMockContext = (): GraphContext => ({
  agent: {} as GraphContext['agent'],
  logger: {
    info: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  } as unknown as Console,
});

// Helper to create initial state
const createState = <T extends Record<string, unknown>>(
  context: T
): WorkflowState<T> => ({
  currentNode: 'TEST',
  status: 'running',
  updatedAt: new Date().toISOString(),
  conversationHistory: [],
  context,
});

describe('EvalNode', () => {
  describe('basic functionality', () => {
    it('should execute pure function and update context', async () => {
      const node = new EvalNodeRuntime<{ count: number }>({
        fn: (state) => ({
          count: state.context.count + 1,
        }),
        next: 'NEXT',
      });

      const state = createState({ count: 5 });
      const context = createMockContext();

      const result = await node.execute(state, context);

      expect(result.stateUpdate.context?.count).toBe(6);
    });

    it('should track updated keys', async () => {
      interface TestContext {
        a: number;
        b: string;
        lastEvalResult?: {
          success: boolean;
          updatedKeys: string[];
          duration: number;
        };
        [key: string]: unknown;
      }

      const node = new EvalNodeRuntime<TestContext>({
        fn: () => ({
          a: 10,
          b: 'updated',
        }),
        next: 'NEXT',
      });

      const state = createState<TestContext>({ a: 1, b: 'original' });
      const context = createMockContext();

      const result = await node.execute(state, context);

      const evalResult = result.stateUpdate.context?.lastEvalResult;
      expect(evalResult?.success).toBe(true);
      expect(evalResult?.updatedKeys).toContain('a');
      expect(evalResult?.updatedKeys).toContain('b');
    });

    it('should preserve existing context values not modified', async () => {
      const node = new EvalNodeRuntime<{ a: number; b: string; c: boolean }>({
        fn: () => ({
          a: 100,
        }),
        next: 'NEXT',
      });

      const state = createState({ a: 1, b: 'keep', c: true });
      const context = createMockContext();

      const result = await node.execute(state, context);

      expect(result.stateUpdate.context?.a).toBe(100);
      expect(result.stateUpdate.context?.b).toBe('keep');
      expect(result.stateUpdate.context?.c).toBe(true);
    });
  });

  describe('transitions', () => {
    it('should resolve static transition', () => {
      const node = new EvalNodeRuntime({
        fn: () => ({}),
        next: 'STATIC_NEXT',
      });

      const state = createState({});
      expect(node.resolveNext(state)).toBe('STATIC_NEXT');
    });

    it('should resolve dynamic transition', () => {
      const node = new EvalNodeRuntime<{ done: boolean }>({
        fn: () => ({}),
        next: (state) => (state.context.done ? 'END' : 'CONTINUE'),
      });

      const doneState = createState({ done: true });
      expect(node.resolveNext(doneState)).toBe('END');

      const notDoneState = createState({ done: false });
      expect(node.resolveNext(notDoneState)).toBe('CONTINUE');
    });
  });

  describe('loop pattern', () => {
    it('should support index increment pattern', async () => {
      interface LoopContext {
        items: string[];
        currentIndex: number;
        current: string | null;
        [key: string]: unknown;
      }

      const node = new EvalNodeRuntime<LoopContext>({
        fn: (state) => {
          const nextIdx = state.context.currentIndex + 1;
          return {
            currentIndex: nextIdx,
            current: state.context.items[nextIdx] ?? null,
          };
        },
        next: (state) => (state.context.current ? 'PROCESS' : 'DONE'),
      });

      const state = createState<LoopContext>({
        items: ['a', 'b', 'c'],
        currentIndex: -1,
        current: null,
      });

      const context = createMockContext();

      // First iteration
      const result1 = await node.execute(state, context);
      expect(result1.stateUpdate.context?.currentIndex).toBe(0);
      expect(result1.stateUpdate.context?.current).toBe('a');

      // Update state for next iteration
      const state2 = createState<LoopContext>({
        ...state.context,
        ...result1.stateUpdate.context,
      });

      expect(node.resolveNext(state2)).toBe('PROCESS');

      // Continue until done
      const state3 = createState<LoopContext>({
        items: ['a', 'b', 'c'],
        currentIndex: 2,
        current: 'c',
      });

      const result3 = await node.execute(state3, context);
      expect(result3.stateUpdate.context?.currentIndex).toBe(3);
      expect(result3.stateUpdate.context?.current).toBeNull();

      const finalState = createState<LoopContext>({
        ...state3.context,
        ...result3.stateUpdate.context,
      });
      expect(node.resolveNext(finalState)).toBe('DONE');
    });
  });
});

describe('DynamicAgentNode', () => {
  describe('configuration resolution', () => {
    it('should resolve static model', async () => {
      const node = new DynamicAgentNodeRuntime<{ task: string }>({
        model: 'haiku',
        prompt: 'Test prompt',
        next: 'NEXT',
      });

      // The model is resolved internally - we test the config
      expect(node['config'].model).toBe('haiku');
    });

    it('should have dynamic model function', () => {
      interface TaskContext {
        currentTask: { model: 'haiku' | 'sonnet' | 'opus'; prompt: string };
        [key: string]: unknown;
      }

      const modelFn = (state: WorkflowState<TaskContext>) =>
        state.context.currentTask.model;

      const node = new DynamicAgentNodeRuntime<TaskContext>({
        model: modelFn,
        prompt: (state) => state.context.currentTask.prompt,
        next: 'NEXT',
      });

      expect(typeof node['config'].model).toBe('function');
      expect(typeof node['config'].prompt).toBe('function');
    });

    it('should resolve static prompt', () => {
      const node = new DynamicAgentNodeRuntime({
        model: 'sonnet',
        prompt: 'Static prompt text',
        next: 'NEXT',
      });

      expect(node['config'].prompt).toBe('Static prompt text');
    });
  });

  describe('default values', () => {
    it('should use default resultKey', () => {
      const node = new DynamicAgentNodeRuntime({
        model: 'haiku',
        prompt: 'Test',
        next: 'NEXT',
      });

      expect(node['config'].resultKey).toBe('lastDynamicAgentResult');
    });

    it('should use default throwOnError', () => {
      const node = new DynamicAgentNodeRuntime({
        model: 'haiku',
        prompt: 'Test',
        next: 'NEXT',
      });

      expect(node['config'].throwOnError).toBe(true);
    });
  });
});

describe('DynamicCommandNode', () => {
  describe('configuration resolution', () => {
    it('should resolve static command', () => {
      const node = new DynamicCommandNodeRuntime({
        command: 'echo hello',
        next: 'NEXT',
      });

      expect(node['config'].command).toBe('echo hello');
    });

    it('should have dynamic command function', () => {
      interface CmdContext {
        currentTask: { command: string };
        [key: string]: unknown;
      }

      const node = new DynamicCommandNodeRuntime<CmdContext>({
        command: (state) => state.context.currentTask.command,
        next: 'NEXT',
      });

      expect(typeof node['config'].command).toBe('function');
    });
  });

  describe('default values', () => {
    it('should use default resultKey', () => {
      const node = new DynamicCommandNodeRuntime({
        command: 'echo test',
        next: 'NEXT',
      });

      expect(node['config'].resultKey).toBe('lastDynamicCommandResult');
    });

    it('should use default throwOnError', () => {
      const node = new DynamicCommandNodeRuntime({
        command: 'echo test',
        next: 'NEXT',
      });

      expect(node['config'].throwOnError).toBe(true);
    });
  });

  describe('execution', () => {
    it('should execute static command successfully', async () => {
      interface CmdResultContext {
        lastDynamicCommandResult?: {
          success: boolean;
          stdout: string;
          exitCode: number;
          command: string;
          stderr: string;
          duration: number;
        };
        [key: string]: unknown;
      }

      const node = new DynamicCommandNodeRuntime<CmdResultContext>({
        command: 'echo "hello world"',
        next: 'NEXT',
      });

      const state = createState<CmdResultContext>({});
      const context = createMockContext();

      const result = await node.execute(state, context);

      expect(result.stateUpdate.context?.lastDynamicCommandResult?.success).toBe(
        true
      );
      expect(result.stateUpdate.context?.lastDynamicCommandResult?.stdout).toBe(
        'hello world'
      );
      expect(
        result.stateUpdate.context?.lastDynamicCommandResult?.exitCode
      ).toBe(0);
    });

    it('should execute dynamic command from state', async () => {
      interface CmdContext {
        message: string;
        lastDynamicCommandResult?: {
          success: boolean;
          stdout: string;
          exitCode: number;
          command: string;
          stderr: string;
          duration: number;
        };
        [key: string]: unknown;
      }

      const node = new DynamicCommandNodeRuntime<CmdContext>({
        command: (state) => `echo "${state.context.message}"`,
        next: 'NEXT',
      });

      const state = createState<CmdContext>({ message: 'dynamic message' });
      const context = createMockContext();

      const result = await node.execute(state, context);

      expect(result.stateUpdate.context?.lastDynamicCommandResult?.stdout).toBe(
        'dynamic message'
      );
    });

    it('should capture command in result', async () => {
      interface CmdResultContext {
        lastDynamicCommandResult?: {
          success: boolean;
          stdout: string;
          exitCode: number;
          command: string;
          stderr: string;
          duration: number;
        };
        [key: string]: unknown;
      }

      const node = new DynamicCommandNodeRuntime<CmdResultContext>({
        command: 'echo test',
        next: 'NEXT',
      });

      const state = createState<CmdResultContext>({});
      const context = createMockContext();

      const result = await node.execute(state, context);

      expect(result.stateUpdate.context?.lastDynamicCommandResult?.command).toBe(
        'echo test'
      );
    });
  });
});

describe('workflow factory functions', () => {
  it('should export EvalNode factory', async () => {
    const { EvalNode } = await import('../define-workflow');

    const def = EvalNode({
      fn: () => ({ test: true }),
      next: 'NEXT',
    });

    expect(def.type).toBe('eval');
    expect(typeof def.fn).toBe('function');
    expect(def.next).toBe('NEXT');
  });

  it('should export DynamicAgentNode factory', async () => {
    const { DynamicAgentNode } = await import('../define-workflow');

    const def = DynamicAgentNode({
      model: 'sonnet',
      prompt: 'Test prompt',
      next: 'NEXT',
    });

    expect(def.type).toBe('dynamic-agent');
    expect(def.model).toBe('sonnet');
    expect(def.prompt).toBe('Test prompt');
  });

  it('should export DynamicCommandNode factory', async () => {
    const { DynamicCommandNode } = await import('../define-workflow');

    const def = DynamicCommandNode({
      command: 'echo hello',
      next: 'NEXT',
    });

    expect(def.type).toBe('dynamic-command');
    expect(def.command).toBe('echo hello');
  });
});
