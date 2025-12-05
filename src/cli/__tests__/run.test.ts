/**
 * Tests for the run CLI argument parsing
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { parseArgs, buildConfig, showHelp } from '../run';
import { CliError } from '../types';

describe('run CLI', () => {
  describe('parseArgs', () => {
    it('should parse --config flag', () => {
      const args = parseArgs(['--config', 'my-workflow.ts']);
      expect(args.configPath).toBe('my-workflow.ts');
    });

    it('should parse -c shorthand', () => {
      const args = parseArgs(['-c', 'workflow.ts']);
      expect(args.configPath).toBe('workflow.ts');
    });

    it('should parse --context flag', () => {
      const args = parseArgs(['--context', '{"issueId": 123}']);
      expect(args.context).toBe('{"issueId": 123}');
    });

    it('should parse --state-dir flag', () => {
      const args = parseArgs(['--state-dir', '/tmp/state']);
      expect(args.stateDir).toBe('/tmp/state');
    });

    it('should parse --api-key flag', () => {
      const args = parseArgs(['--api-key', 'sk-xxx']);
      expect(args.apiKey).toBe('sk-xxx');
    });

    it('should parse --dry-run flag', () => {
      const args = parseArgs(['--dry-run']);
      expect(args.dryRun).toBe(true);
    });

    it('should parse --verbose flag', () => {
      const args = parseArgs(['--verbose']);
      expect(args.verbose).toBe(true);
    });

    it('should parse -v shorthand', () => {
      const args = parseArgs(['-v']);
      expect(args.verbose).toBe(true);
    });

    it('should parse --help flag', () => {
      const args = parseArgs(['--help']);
      expect(args.help).toBe(true);
    });

    it('should parse -h shorthand', () => {
      const args = parseArgs(['-h']);
      expect(args.help).toBe(true);
    });

    it('should parse multiple flags', () => {
      const args = parseArgs([
        '--config', 'my-workflow.ts',
        '--context', '{"issueId": 123}',
        '--state-dir', '/tmp/state',
        '--api-key', 'sk-xxx',
        '--verbose',
        '--dry-run',
      ]);

      expect(args.configPath).toBe('my-workflow.ts');
      expect(args.context).toBe('{"issueId": 123}');
      expect(args.stateDir).toBe('/tmp/state');
      expect(args.apiKey).toBe('sk-xxx');
      expect(args.verbose).toBe(true);
      expect(args.dryRun).toBe(true);
    });

    it('should default boolean flags to false', () => {
      const args = parseArgs([]);
      expect(args.dryRun).toBe(false);
      expect(args.verbose).toBe(false);
      expect(args.help).toBe(false);
    });

    it('should handle missing values for flags', () => {
      const args = parseArgs(['--config']);
      expect(args.configPath).toBeUndefined();
    });
  });

  describe('buildConfig', () => {
    // Save and restore environment
    const saveEnv = () => {
      return {
        ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'],
      };
    };

    const restoreEnv = (saved: Record<string, string | undefined>) => {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    };

    let savedEnv: Record<string, string | undefined>;

    beforeEach(() => {
      savedEnv = saveEnv();
    });

    afterEach(() => {
      restoreEnv(savedEnv);
    });

    it('should build config from args', () => {
      const args = parseArgs(['--config', 'my.ts', '--api-key', 'sk-xxx']);
      const config = buildConfig(args);

      expect(config.configPath).toBe('my.ts');
      expect(config.apiKey).toBe('sk-xxx');
    });

    it('should use environment variable for API key', () => {
      process.env['ANTHROPIC_API_KEY'] = 'env-api-key';

      const args = parseArgs([]);
      const config = buildConfig(args);

      expect(config.apiKey).toBe('env-api-key');
    });

    it('should prefer CLI arg over env var for API key', () => {
      process.env['ANTHROPIC_API_KEY'] = 'env-api-key';

      const args = parseArgs(['--api-key', 'cli-api-key']);
      const config = buildConfig(args);

      expect(config.apiKey).toBe('cli-api-key');
    });

    it('should throw if API key is missing in non-dry-run mode', () => {
      delete process.env['ANTHROPIC_API_KEY'];

      const args = parseArgs([]);

      expect(() => buildConfig(args)).toThrow(CliError);
    });

    it('should not throw if API key is missing in dry-run mode', () => {
      delete process.env['ANTHROPIC_API_KEY'];

      const args = parseArgs(['--dry-run']);
      const config = buildConfig(args);

      expect(config.dryRun).toBe(true);
      expect(config.apiKey).toBe('');
    });

    it('should use default config path', () => {
      const args = parseArgs(['--api-key', 'sk-xxx']);
      const config = buildConfig(args);

      expect(config.configPath).toBe('atomic.config.ts');
    });

    it('should use default state dir', () => {
      const args = parseArgs(['--api-key', 'sk-xxx']);
      const config = buildConfig(args);

      expect(config.stateDir).toBe('.ci');
    });

    it('should parse valid context JSON', () => {
      const args = parseArgs(['--api-key', 'sk-xxx', '--context', '{"issueId": 123, "name": "test"}']);
      const config = buildConfig(args);

      expect(config.context).toEqual({ issueId: 123, name: 'test' });
    });

    it('should throw for invalid context JSON', () => {
      const args = parseArgs(['--api-key', 'sk-xxx', '--context', 'invalid json']);

      expect(() => buildConfig(args)).toThrow(CliError);
    });

    it('should throw if context is not an object', () => {
      const args = parseArgs(['--api-key', 'sk-xxx', '--context', '"string"']);

      expect(() => buildConfig(args)).toThrow(CliError);
    });

    it('should throw if context is an array', () => {
      const args = parseArgs(['--api-key', 'sk-xxx', '--context', '[1, 2, 3]']);

      expect(() => buildConfig(args)).toThrow(CliError);
    });

    it('should include all optional config values', () => {
      const args = parseArgs([
        '--config', 'custom.ts',
        '--api-key', 'sk-xxx',
        '--context', '{"test": true}',
        '--state-dir', '/custom/state',
        '--verbose',
        '--dry-run',
      ]);

      const config = buildConfig(args);

      expect(config.configPath).toBe('custom.ts');
      expect(config.apiKey).toBe('sk-xxx');
      expect(config.context).toEqual({ test: true });
      expect(config.stateDir).toBe('/custom/state');
      expect(config.verbose).toBe(true);
      expect(config.dryRun).toBe(true);
    });
  });

  describe('showHelp', () => {
    it('should output help without throwing', () => {
      // Just verify it doesn't throw
      expect(() => showHelp()).not.toThrow();
    });
  });
});
