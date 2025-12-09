/**
 * Tests for StateManager - workflow state persistence.
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { StateManager } from '../state-manager';
import type { BaseState } from '../types';
import { WorkflowStatus } from '../enums';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface TestState extends BaseState {
  context: {
    counter: number;
    data?: string;
  };
}

/**
 * Helper to create a valid test state.
 */
function createTestState(overrides: Partial<TestState> = {}): TestState {
  return {
    currentNode: 'TEST',
    status: WorkflowStatus.Running,
    updatedAt: new Date().toISOString(),
    conversationHistory: [],
    context: {
      counter: 1,
    },
    ...overrides,
  };
}

describe('StateManager', () => {
  let testDir: string;
  let manager: StateManager<TestState>;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = path.join(os.tmpdir(), `state-manager-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    manager = new StateManager<TestState>({ stateDir: testDir });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('save and load', () => {
    it('should save and load state correctly', async () => {
      const state = createTestState({
        currentNode: 'TEST',
        context: {
          counter: 42,
          data: 'test data',
        },
      });

      await manager.save('workflow-1', state);
      const loaded = await manager.load('workflow-1');

      expect(loaded).toEqual(state);
    });

    it('should return null for non-existent state', async () => {
      const loaded = await manager.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should overwrite existing state', async () => {
      const state1 = createTestState({
        currentNode: 'A',
        context: { counter: 1 },
      });
      const state2 = createTestState({
        currentNode: 'B',
        status: WorkflowStatus.Completed,
        context: { counter: 2 },
      });

      await manager.save('workflow', state1);
      await manager.save('workflow', state2);
      const loaded = await manager.load('workflow');

      expect(loaded).toEqual(state2);
    });

    it('should handle complex nested state', async () => {
      const state = createTestState({
        currentNode: 'COMPLEX',
        context: {
          counter: 100,
          data: JSON.stringify({ nested: { deep: { value: 'test' } } }),
        },
      });

      await manager.save('complex', state);
      const loaded = await manager.load('complex');

      expect(loaded).toEqual(state);
    });
  });

  describe('delete', () => {
    it('should delete existing state', async () => {
      const state = createTestState();

      await manager.save('to-delete', state);
      expect(await manager.load('to-delete')).not.toBeNull();

      await manager.delete('to-delete');
      expect(await manager.load('to-delete')).toBeNull();
    });

    it('should not throw when deleting non-existent state', async () => {
      // Should not throw
      await expect(manager.delete('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list all workflow IDs', async () => {
      const state = createTestState();

      await manager.save('workflow-1', state);
      await manager.save('workflow-2', state);
      await manager.save('workflow-3', state);

      const ids = await manager.list();

      expect(ids).toContain('workflow-1');
      expect(ids).toContain('workflow-2');
      expect(ids).toContain('workflow-3');
      expect(ids).toHaveLength(3);
    });

    it('should return empty array for empty directory', async () => {
      const ids = await manager.list();
      expect(ids).toEqual([]);
    });

    it('should return empty array for non-existent directory', async () => {
      const nonExistentManager = new StateManager<TestState>({
        stateDir: '/non/existent/path',
      });
      const ids = await nonExistentManager.list();
      expect(ids).toEqual([]);
    });
  });

  describe('ensureStateDir', () => {
    it('should create state directory if it does not exist', async () => {
      const newDir = path.join(testDir, 'new-subdir', 'nested');
      const newManager = new StateManager<TestState>({ stateDir: newDir });

      await newManager.ensureStateDir();

      const stat = await fs.stat(newDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      await manager.ensureStateDir();
      await expect(manager.ensureStateDir()).resolves.toBeUndefined();
    });
  });

  describe('ID sanitization (path traversal prevention)', () => {
    it('should sanitize IDs with special characters', async () => {
      const state = createTestState();

      // IDs with special characters that could be path traversal attacks
      await manager.save('../../../etc/passwd', state);
      await manager.save('workflow@#$%', state);
      await manager.save('path/to/file', state);

      // Should be saved with sanitized names
      const files = await fs.readdir(testDir);

      // All should be sanitized to safe filenames
      expect(files.every((f) => !f.includes('/') && !f.includes('..'))).toBe(true);
    });

    it('should preserve alphanumeric and dash/underscore characters', async () => {
      const state = createTestState();

      await manager.save('valid-workflow_123', state);
      const loaded = await manager.load('valid-workflow_123');

      expect(loaded).toEqual(state);
    });
  });

  describe('error handling', () => {
    it('should handle corrupted state files gracefully', async () => {
      // Write a corrupted JSON file directly
      const filePath = path.join(testDir, 'corrupted.json');
      await fs.writeFile(filePath, 'not valid json { broken');

      const loaded = await manager.load('corrupted');
      expect(loaded).toBeNull();
    });
  });
});
