/**
 * Tests for the CLI argument parsing
 */

import { describe, expect, it } from 'bun:test';
import { parseArgs, buildConfig } from '../cli';
import { DispatchError } from '../types';

describe('cli', () => {
  describe('parseArgs', () => {
    it('should parse --owner flag', () => {
      const args = parseArgs(['--owner', 'iota-uz']);
      expect(args.owner).toBe('iota-uz');
    });

    it('should parse --repo flag', () => {
      const args = parseArgs(['--repo', 'foundry']);
      expect(args.repo).toBe('foundry');
    });

    it('should parse --token flag', () => {
      const args = parseArgs(['--token', 'ghp_xxx']);
      expect(args.token).toBe('ghp_xxx');
    });

    it('should parse --label flag', () => {
      const args = parseArgs(['--label', 'my-queue']);
      expect(args.label).toBe('my-queue');
    });

    it('should parse --max-concurrent flag', () => {
      const args = parseArgs(['--max-concurrent', '5']);
      expect(args.maxConcurrent).toBe(5);
    });

    it('should ignore invalid max-concurrent value', () => {
      const args = parseArgs(['--max-concurrent', 'invalid']);
      expect(args.maxConcurrent).toBeUndefined();
    });

    it('should ignore zero max-concurrent value', () => {
      const args = parseArgs(['--max-concurrent', '0']);
      expect(args.maxConcurrent).toBeUndefined();
    });

    it('should parse --output flag', () => {
      const args = parseArgs(['--output', 'matrix.json']);
      expect(args.output).toBe('matrix.json');
    });

    it('should parse -o shorthand', () => {
      const args = parseArgs(['-o', 'out.json']);
      expect(args.output).toBe('out.json');
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
        '--owner', 'iota-uz',
        '--repo', 'foundry',
        '--token', 'ghp_xxx',
        '--label', 'queue',
        '--max-concurrent', '3',
        '--verbose',
        '--dry-run',
      ]);

      expect(args.owner).toBe('iota-uz');
      expect(args.repo).toBe('foundry');
      expect(args.token).toBe('ghp_xxx');
      expect(args.label).toBe('queue');
      expect(args.maxConcurrent).toBe(3);
      expect(args.verbose).toBe(true);
      expect(args.dryRun).toBe(true);
    });

    it('should default boolean flags to false', () => {
      const args = parseArgs([]);
      expect(args.dryRun).toBe(false);
      expect(args.verbose).toBe(false);
      expect(args.help).toBe(false);
    });
  });

  describe('buildConfig', () => {
    // Save and restore environment
    const saveEnv = () => {
      const saved = {
        GITHUB_TOKEN: process.env['GITHUB_TOKEN'],
        GITHUB_REPOSITORY: process.env['GITHUB_REPOSITORY'],
      };
      return saved;
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

    it('should build config from args', () => {
      const saved = saveEnv();
      try {
        const args = parseArgs(['--owner', 'iota-uz', '--repo', 'foundry', '--token', 'ghp_xxx']);
        const config = buildConfig(args);

        expect(config.owner).toBe('iota-uz');
        expect(config.repo).toBe('foundry');
        expect(config.token).toBe('ghp_xxx');
      } finally {
        restoreEnv(saved);
      }
    });

    it('should use environment variables as fallback', () => {
      const saved = saveEnv();
      try {
        process.env['GITHUB_TOKEN'] = 'env_token';
        process.env['GITHUB_REPOSITORY'] = 'env_owner/env_repo';
        delete process.env['GITHUB_REPOSITORY_OWNER'];
        delete process.env['GITHUB_REPOSITORY_NAME'];

        const args = parseArgs([]);
        const config = buildConfig(args);

        expect(config.token).toBe('env_token');
        expect(config.owner).toBe('env_owner');
        expect(config.repo).toBe('env_repo');
      } finally {
        restoreEnv(saved);
      }
    });

    it('should parse GITHUB_REPOSITORY format', () => {
      const saved = saveEnv();
      try {
        process.env['GITHUB_TOKEN'] = 'token';
        process.env['GITHUB_REPOSITORY'] = 'parsed-owner/parsed-repo';
        delete process.env['GITHUB_REPOSITORY_OWNER'];
        delete process.env['GITHUB_REPOSITORY_NAME'];

        const args = parseArgs([]);
        const config = buildConfig(args);

        expect(config.owner).toBe('parsed-owner');
        expect(config.repo).toBe('parsed-repo');
      } finally {
        restoreEnv(saved);
      }
    });

    it('should throw if token is missing', () => {
      const saved = saveEnv();
      try {
        delete process.env['GITHUB_TOKEN'];

        const args = parseArgs(['--owner', 'owner', '--repo', 'repo']);

        expect(() => buildConfig(args)).toThrow(DispatchError);
      } finally {
        restoreEnv(saved);
      }
    });

    it('should throw if owner is missing', () => {
      const saved = saveEnv();
      try {
        delete process.env['GITHUB_REPOSITORY'];

        const args = parseArgs(['--token', 'token', '--repo', 'repo']);

        expect(() => buildConfig(args)).toThrow(DispatchError);
      } finally {
        restoreEnv(saved);
      }
    });

    it('should throw if repo is missing', () => {
      const saved = saveEnv();
      try {
        delete process.env['GITHUB_REPOSITORY'];

        const args = parseArgs(['--token', 'token', '--owner', 'owner']);

        expect(() => buildConfig(args)).toThrow(DispatchError);
      } finally {
        restoreEnv(saved);
      }
    });

    it('should include optional config values', () => {
      const saved = saveEnv();
      try {
        const args = parseArgs([
          '--owner', 'owner',
          '--repo', 'repo',
          '--token', 'token',
          '--label', 'my-label',
          '--max-concurrent', '5',
          '--output', 'out.json',
          '--verbose',
          '--dry-run',
        ]);

        const config = buildConfig(args);

        expect(config.queueLabel).toBe('my-label');
        expect(config.maxConcurrent).toBe(5);
        expect(config.outputFile).toBe('out.json');
        expect(config.verbose).toBe(true);
        expect(config.dryRun).toBe(true);
      } finally {
        restoreEnv(saved);
      }
    });
  });
});
