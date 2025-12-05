/**
 * Tests for the config-loader module
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import {
  loadConfig,
  validateTransitions,
  validateConfigSchema,
  validateRuntimeTransition,
  resolveTransition,
} from '../config-loader';
import { ConfigValidationError } from '../types';

const TEST_DIR = '/tmp/config-loader-tests';

describe('config-loader', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('validateConfigSchema', () => {
    it('should return errors for missing id', () => {
      const errors = validateConfigSchema({ nodes: {} });
      expect(errors).toContain('Config must have an "id" property');
    });

    it('should return errors for non-string id', () => {
      const errors = validateConfigSchema({ id: 123, nodes: {} });
      expect(errors.some((e) => e.includes('id'))).toBe(true);
    });

    it('should return errors for empty id', () => {
      const errors = validateConfigSchema({ id: '  ', nodes: {} });
      expect(errors.some((e) => e.includes('empty'))).toBe(true);
    });

    it('should return errors for missing nodes', () => {
      const errors = validateConfigSchema({ id: 'test' });
      expect(errors.some((e) => e.includes('nodes'))).toBe(true);
    });

    it('should return errors for empty nodes object', () => {
      const errors = validateConfigSchema({ id: 'test', nodes: {} });
      expect(errors.some((e) => e.includes('at least one node'))).toBe(true);
    });

    it('should return errors for node without type', () => {
      const errors = validateConfigSchema({
        id: 'test',
        nodes: {
          PLAN: { next: 'END' },
        },
      });
      expect(errors.some((e) => e.includes('type'))).toBe(true);
    });

    it('should return errors for node without next', () => {
      const errors = validateConfigSchema({
        id: 'test',
        nodes: {
          PLAN: { type: 'agent', role: 'test', system: 'test' },
        },
      });
      expect(errors.some((e) => e.includes('next'))).toBe(true);
    });

    it('should return errors for AgentNode without role', () => {
      const errors = validateConfigSchema({
        id: 'test',
        nodes: {
          PLAN: { type: 'agent', system: 'test', next: 'END' },
        },
      });
      expect(errors.some((e) => e.includes('role'))).toBe(true);
    });

    it('should return errors for AgentNode without system', () => {
      const errors = validateConfigSchema({
        id: 'test',
        nodes: {
          PLAN: { type: 'agent', role: 'test', next: 'END' },
        },
      });
      expect(errors.some((e) => e.includes('system'))).toBe(true);
    });

    it('should return errors for CommandNode without command', () => {
      const errors = validateConfigSchema({
        id: 'test',
        nodes: {
          SUBMIT: { type: 'command', next: 'END' },
        },
      });
      expect(errors.some((e) => e.includes('command'))).toBe(true);
    });

    it('should return no errors for valid config', () => {
      const errors = validateConfigSchema({
        id: 'test',
        nodes: {
          PLAN: { type: 'agent', role: 'architect', system: 'You are a planner', next: 'END' },
        },
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateTransitions', () => {
    it('should return no errors for valid static transitions', () => {
      const config = {
        id: 'test',
        nodes: {
          PLAN: { type: 'agent' as const, role: 'a', system: 's', next: 'IMPLEMENT' },
          IMPLEMENT: { type: 'agent' as const, role: 'b', system: 's', next: 'END' },
        },
      };
      const errors = validateTransitions(config);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid static transition', () => {
      const config = {
        id: 'test',
        nodes: {
          PLAN: { type: 'agent' as const, role: 'a', system: 's', next: 'NONEXISTENT' },
        },
      };
      const errors = validateTransitions(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('NONEXISTENT');
    });

    it('should accept dynamic transitions (functions)', () => {
      const config = {
        id: 'test',
        nodes: {
          PLAN: {
            type: 'agent' as const,
            role: 'a',
            system: 's',
            next: (_state: { context: Record<string, unknown> }) => 'END',
          },
        },
      };
      const errors = validateTransitions(config);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateRuntimeTransition', () => {
    const validNodes = new Set(['PLAN', 'IMPLEMENT', 'END']);

    it('should not throw for valid transitions', () => {
      expect(() => {
        validateRuntimeTransition('PLAN', validNodes, 'START');
      }).not.toThrow();
    });

    it('should throw for invalid transitions', () => {
      expect(() => {
        validateRuntimeTransition('NONEXISTENT', validNodes, 'START');
      }).toThrow(/NONEXISTENT/);
    });
  });

  describe('resolveTransition', () => {
    const validNodes = new Set(['PLAN', 'IMPLEMENT', 'END']);

    // Create a minimal valid WorkflowState
    const createState = <T extends Record<string, unknown>>(context: T) => ({
      currentNode: 'PLAN',
      status: 'running' as const,
      updatedAt: new Date().toISOString(),
      conversationHistory: [],
      context,
    });

    it('should resolve static transitions', () => {
      const result = resolveTransition('IMPLEMENT', createState({}), validNodes, 'PLAN');
      expect(result).toBe('IMPLEMENT');
    });

    it('should resolve dynamic transitions', () => {
      const transition = (state: { context: { done?: boolean } }) =>
        state.context.done ? 'END' : 'IMPLEMENT';

      const result1 = resolveTransition(transition, createState({ done: false }), validNodes, 'PLAN');
      expect(result1).toBe('IMPLEMENT');

      const result2 = resolveTransition(transition, createState({ done: true }), validNodes, 'PLAN');
      expect(result2).toBe('END');
    });

    it('should throw for invalid dynamic transition result', () => {
      const transition = () => 'NONEXISTENT';
      expect(() => {
        resolveTransition(transition, createState({}), validNodes, 'PLAN');
      }).toThrow(/NONEXISTENT/);
    });
  });

  describe('loadConfig', () => {
    it('should throw ConfigValidationError for non-existent file', async () => {
      try {
        await loadConfig({ configPath: '/nonexistent/path/config.ts' });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).message).toContain('not found');
      }
    });

    it('should throw for file without default export', async () => {
      const configPath = join(TEST_DIR, 'no-default.ts');
      await writeFile(configPath, 'export const foo = 1;');

      try {
        await loadConfig({ configPath });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).message).toContain('default export');
      }
    });

    it('should throw for invalid config schema', async () => {
      const configPath = join(TEST_DIR, 'invalid-schema.ts');
      await writeFile(configPath, 'export default { invalid: true };');

      try {
        await loadConfig({ configPath });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).errors.length).toBeGreaterThan(0);
      }
    });

    it('should load valid config successfully', async () => {
      const configPath = join(TEST_DIR, 'valid.ts');
      const configContent = `
        export default {
          id: 'test-workflow',
          nodes: {
            PLAN: { type: 'agent', role: 'architect', system: 'You are a planner', next: 'END' }
          }
        };
      `;
      await writeFile(configPath, configContent);

      const result = await loadConfig({ configPath });
      expect(result.config.id).toBe('test-workflow');
      expect(result.validNodeNames.has('PLAN')).toBe(true);
      expect(result.validNodeNames.has('END')).toBe(true);
    });

    it('should validate transitions by default', async () => {
      const configPath = join(TEST_DIR, 'invalid-transition.ts');
      const configContent = `
        export default {
          id: 'test-workflow',
          nodes: {
            PLAN: { type: 'agent', role: 'architect', system: 'test', next: 'NONEXISTENT' }
          }
        };
      `;
      await writeFile(configPath, configContent);

      try {
        await loadConfig({ configPath });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).message).toContain('NONEXISTENT');
      }
    });

    it('should skip transition validation when disabled', async () => {
      const configPath = join(TEST_DIR, 'skip-transition.ts');
      const configContent = `
        export default {
          id: 'test-workflow',
          nodes: {
            PLAN: { type: 'agent', role: 'architect', system: 'test', next: 'NONEXISTENT' }
          }
        };
      `;
      await writeFile(configPath, configContent);

      const result = await loadConfig({ configPath, validateTransitions: false });
      expect(result.config.id).toBe('test-workflow');
    });
  });
});
