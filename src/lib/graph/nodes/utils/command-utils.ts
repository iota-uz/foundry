/**
 * @sys/graph - Shared command execution utilities
 */

import { spawn } from 'bun';

export interface CommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

/**
 * Executes a shell command using Bun.spawn.
 */
export async function executeCommand(
  command: string,
  options: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<CommandExecutionResult> {
  const { cwd, env, timeout = 300000 } = options;

  // Split command into parts for spawn
  const parts = parseCommand(command);

  // Create the subprocess
  const proc = spawn({
    cmd: parts,
    cwd: cwd || process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      proc.kill();
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);
  });

  // Wait for completion or timeout
  try {
    const result = await Promise.race([
      proc.exited,
      timeoutPromise,
    ]);

    // Read outputs
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    return {
      exitCode: result as number,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      success: result === 0,
    };
  } catch (error) {
    // Ensure process is killed on error
    try {
      proc.kill();
    } catch {
      // Ignore kill errors
    }
    throw error;
  }
}

/**
 * Parses a command string into an array for spawn.
 */
export function parseCommand(command: string): string[] {
  // For complex shell syntax, use sh -c
  if (hasShellSyntax(command)) {
    return ['sh', '-c', command];
  }

  // Simple command - split by spaces, respecting quotes
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const char of command) {
    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuote) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Checks if a command contains shell syntax that requires sh -c.
 */
export function hasShellSyntax(command: string): boolean {
  const shellChars = ['|', '>', '<', '&&', '||', ';', '`', '$', '(', ')'];
  return shellChars.some((char) => command.includes(char));
}
