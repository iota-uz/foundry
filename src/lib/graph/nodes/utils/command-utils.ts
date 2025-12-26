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
 * Command specification - either a shell string or an argument array.
 *
 * - String: Executed via shell (sh -c), supports pipes, redirects, etc.
 * - Array: Executed directly without shell interpretation (safer for user input)
 */
export type CommandSpec = string | string[];

/**
 * Executes a command using Bun.spawn.
 *
 * @param command - Either a shell string or an array of arguments
 *   - String: Passed to shell (sh -c) for execution, supports pipes/redirects
 *   - Array: Executed directly without shell interpretation (safer for user input)
 */
export async function executeCommand(
  command: CommandSpec,
  options: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<CommandExecutionResult> {
  const { cwd, env, timeout = 300000 } = options;

  // Determine command parts based on type
  const parts = Array.isArray(command)
    ? command // Array: execute directly without shell
    : parseCommand(command); // String: parse and potentially wrap in shell

  // Create the subprocess
  const proc = spawn({
    cmd: parts,
    cwd: (cwd !== undefined && cwd !== '') ? cwd : process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Create timeout promise
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
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

    // Clear timeout on success
    if (timeoutId !== null) clearTimeout(timeoutId);

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
    // Clear timeout on error
    if (timeoutId !== undefined && timeoutId !== null) clearTimeout(timeoutId);

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
