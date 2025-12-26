/**
 * Path utilities for .foundry directory structure
 */

import path from 'path';
import fs from 'fs/promises';

/**
 * Get the .foundry directory path
 */
export function getFoundryDir(projectRoot?: string): string {
  const root = (projectRoot !== undefined && projectRoot !== null && projectRoot !== '') ? projectRoot : process.cwd();
  return path.join(root, '.foundry');
}

/**
 * Get database file path
 */
export function getDbPath(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'foundry.db');
}

/**
 * Get project.yaml path
 */
export function getProjectPath(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'project.yaml');
}

/**
 * Get constitution.yaml path
 */
export function getConstitutionPath(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'constitution.yaml');
}

/**
 * Get lessons-learned.md path
 */
export function getLessonsPath(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'lessons-learned.md');
}

/**
 * Get modules directory path
 */
export function getModulesDir(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'modules');
}

/**
 * Get module directory path
 */
export function getModuleDir(moduleSlug: string, projectRoot?: string): string {
  return path.join(getModulesDir(projectRoot), moduleSlug);
}

/**
 * Get module.yaml path
 */
export function getModulePath(
  moduleSlug: string,
  projectRoot?: string
): string {
  return path.join(getModuleDir(moduleSlug, projectRoot), 'module.yaml');
}

/**
 * Get features directory path for a module
 */
export function getFeaturesDir(
  moduleSlug: string,
  projectRoot?: string
): string {
  return path.join(getModuleDir(moduleSlug, projectRoot), 'features');
}

/**
 * Get feature file path
 */
export function getFeaturePath(
  moduleSlug: string,
  featureSlug: string,
  projectRoot?: string
): string {
  return path.join(
    getFeaturesDir(moduleSlug, projectRoot),
    `${featureSlug}.yaml`
  );
}

/**
 * Get schemas directory path
 */
export function getSchemasDir(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'schemas');
}

/**
 * Get schema.dbml path
 */
export function getSchemaPath(projectRoot?: string): string {
  return path.join(getSchemasDir(projectRoot), 'schema.dbml');
}

/**
 * Get APIs directory path
 */
export function getApisDir(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'apis');
}

/**
 * Get openapi.yaml path
 */
export function getOpenApiPath(projectRoot?: string): string {
  return path.join(getApisDir(projectRoot), 'openapi.yaml');
}

/**
 * Get schema.graphql path
 */
export function getGraphQlPath(projectRoot?: string): string {
  return path.join(getApisDir(projectRoot), 'schema.graphql');
}

/**
 * Get components directory path
 */
export function getComponentsDir(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'components');
}

/**
 * Get component file path
 */
export function getComponentPath(
  componentType: 'pages' | 'shared',
  componentName: string,
  projectRoot?: string
): string {
  return path.join(
    getComponentsDir(projectRoot),
    componentType,
    `${componentName}.html`
  );
}

/**
 * Get prompts directory path
 */
export function getPromptsDir(projectRoot?: string): string {
  return path.join(getFoundryDir(projectRoot), 'prompts');
}

/**
 * Get prompt file path
 */
export function getPromptPath(
  promptFile: string,
  projectRoot?: string
): string {
  return path.join(getPromptsDir(projectRoot), promptFile);
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize .foundry directory structure
 */
export async function initFoundryStructure(projectRoot?: string): Promise<void> {
  const foundryDir = getFoundryDir(projectRoot);

  // Create directories
  await ensureDir(foundryDir);
  await ensureDir(getModulesDir(projectRoot));
  await ensureDir(getSchemasDir(projectRoot));
  await ensureDir(getApisDir(projectRoot));
  await ensureDir(path.join(getComponentsDir(projectRoot), 'pages'));
  await ensureDir(path.join(getComponentsDir(projectRoot), 'shared'));
  await ensureDir(getPromptsDir(projectRoot));
}
