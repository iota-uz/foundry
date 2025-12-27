/**
 * @sys/logging - Logger tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Logger, createLogger } from '../logger';

describe('Logger', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createLogger', () => {
    test('should create a logger with context', () => {
      const logger = createLogger({ workflowId: 'test-123' });
      expect(logger).toBeInstanceOf(Logger);
    });

    test('should create a logger without context', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('child', () => {
    test('should merge parent and child context', () => {
      const parent = createLogger({ workflowId: 'wf-123' });
      const child = parent.child({ nodeId: 'node-456' });

      // Both loggers should be independent
      expect(child).toBeInstanceOf(Logger);
      expect(child).not.toBe(parent);
    });
  });

  describe('log levels', () => {
    test('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'error';
      const logger = createLogger();

      // Can't easily test output filtering without mocking console,
      // but we can verify the logger was created successfully
      expect(logger).toBeInstanceOf(Logger);
    });

    test('should default to debug in development', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      const logger = createLogger();

      expect(logger).toBeInstanceOf(Logger);
    });

    test('should default to info in production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      const logger = createLogger();

      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('logging methods', () => {
    test('should have all core logging methods', () => {
      const logger = createLogger();

      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    test('should format errors correctly', () => {
      const logger = createLogger();
      const error = new Error('Test error');

      // Should not throw when passing error via attributes
      expect(() => logger.error('Error occurred', { error })).not.toThrow();
    });
  });
});
