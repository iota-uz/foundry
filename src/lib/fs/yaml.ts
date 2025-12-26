/**
 * YAML read/write operations using js-yaml
 */

import fs from 'fs/promises';
import yaml from 'js-yaml';

/**
 * Read and parse a YAML file
 */
export async function readYaml<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.load(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(
      `Failed to read YAML file ${filePath}: ${(error as Error).message}`
    );
  }
}

/**
 * Write data to a YAML file
 */
export async function writeYaml<T>(
  filePath: string,
  data: T,
  options?: { lineWidth?: number; indent?: number }
): Promise<void> {
  try {
    const content = yaml.dump(data, {
      lineWidth: options?.lineWidth ?? 120,
      indent: options?.indent ?? 2,
      sortKeys: false,
      noRefs: true,
    });

    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write YAML file ${filePath}: ${(error as Error).message}`
    );
  }
}

/**
 * Parse YAML string
 */
export function parseYaml<T>(content: string): T {
  try {
    return yaml.load(content) as T;
  } catch (error) {
    throw new Error(`Failed to parse YAML: ${(error as Error).message}`);
  }
}

/**
 * Stringify data to YAML
 */
export function stringifyYaml<T>(
  data: T,
  options?: { lineWidth?: number; indent?: number }
): string {
  return yaml.dump(data, {
    lineWidth: options?.lineWidth ?? 120,
    indent: options?.indent ?? 2,
    sortKeys: false,
    noRefs: true,
  });
}
