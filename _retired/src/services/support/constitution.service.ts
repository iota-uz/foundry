/**
 * ConstitutionService implementation
 * Handles constitution CRUD operations for F6
 */

import path from 'path';
import { Constitution } from '@/types/domain/constitution';
import { getFileService } from '@/services/core/file.service';
import { getFoundryDir } from '@/lib/fs/paths';

const CONSTITUTION_FILE = 'constitution.yaml';

/**
 * ConstitutionService interface
 */
export interface IConstitutionService {
  getConstitution(projectPath: string): Promise<Constitution | null>;
  saveConstitution(
    projectPath: string,
    constitution: Constitution
  ): Promise<void>;
  updateConstitution(
    projectPath: string,
    updates: Partial<Constitution>
  ): Promise<Constitution>;
  deleteConstitution(projectPath: string): Promise<void>;
  constitutionExists(projectPath: string): Promise<boolean>;
}

/**
 * ConstitutionService implementation
 */
export class ConstitutionService implements IConstitutionService {
  private fileService = getFileService();

  /**
   * Get constitution file path
   */
  private getConstitutionPath(projectPath: string): string {
    return path.join(getFoundryDir(projectPath), CONSTITUTION_FILE);
  }

  /**
   * Check if constitution exists
   */
  async constitutionExists(projectPath: string): Promise<boolean> {
    const constitutionPath = this.getConstitutionPath(projectPath);
    return await this.fileService.exists(constitutionPath);
  }

  /**
   * Get constitution
   */
  async getConstitution(projectPath: string): Promise<Constitution | null> {
    try {
      const constitutionPath = this.getConstitutionPath(projectPath);

      // Check if file exists
      const exists = await this.fileService.exists(constitutionPath);
      if (!exists) {
        return null;
      }

      // Read and parse YAML
      const constitution =
        await this.fileService.readYaml<Constitution>(constitutionPath);

      return constitution;
    } catch (error) {
      throw new Error(
        `Failed to get constitution: ${(error as Error).message}`
      );
    }
  }

  /**
   * Save constitution
   */
  async saveConstitution(
    projectPath: string,
    constitution: Constitution
  ): Promise<void> {
    try {
      const constitutionPath = this.getConstitutionPath(projectPath);

      // Ensure .foundry directory exists
      const foundryDir = getFoundryDir(projectPath);
      await this.fileService.ensureDir(foundryDir);

      // Set timestamps
      const now = new Date().toISOString();
      const constitutionWithTimestamps: Constitution = {
        ...constitution,
        version: constitution.version || '1.0',
        createdAt: constitution.createdAt || now,
        updatedAt: now,
      };

      // Write YAML file
      await this.fileService.writeYaml(
        constitutionPath,
        constitutionWithTimestamps
      );
    } catch (error) {
      throw new Error(
        `Failed to save constitution: ${(error as Error).message}`
      );
    }
  }

  /**
   * Update constitution with partial data
   */
  async updateConstitution(
    projectPath: string,
    updates: Partial<Constitution>
  ): Promise<Constitution> {
    try {
      // Get existing constitution
      const existing = await this.getConstitution(projectPath);

      if (!existing) {
        throw new Error('Constitution not found');
      }

      // Merge updates with existing
      const updated: Constitution = {
        ...existing,
        ...updates,
        // Deep merge nested objects
        coding: updates.coding
          ? { ...existing.coding, ...updates.coding }
          : existing.coding,
        security: updates.security
          ? { ...existing.security, ...updates.security }
          : existing.security,
        ux: updates.ux ? { ...existing.ux, ...updates.ux } : existing.ux,
        constraints: updates.constraints
          ? { ...existing.constraints, ...updates.constraints }
          : existing.constraints,
        hooks: updates.hooks
          ? { ...existing.hooks, ...updates.hooks }
          : existing.hooks,
        updatedAt: new Date().toISOString(),
      };

      // Save updated constitution
      await this.saveConstitution(projectPath, updated);

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to update constitution: ${(error as Error).message}`
      );
    }
  }

  /**
   * Delete constitution
   */
  async deleteConstitution(projectPath: string): Promise<void> {
    try {
      const constitutionPath = this.getConstitutionPath(projectPath);

      // Check if file exists
      const exists = await this.fileService.exists(constitutionPath);
      if (!exists) {
        return; // Already deleted
      }

      // Delete file
      await this.fileService.delete(constitutionPath);
    } catch (error) {
      throw new Error(
        `Failed to delete constitution: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create constitution from template
   */
  async createFromTemplate(
    projectPath: string,
    templateType: 'empty' | 'basic' | 'comprehensive'
  ): Promise<Constitution> {
    const now = new Date().toISOString();

    let constitution: Constitution;

    switch (templateType) {
      case 'empty':
        constitution = {
          version: '1.0',
          principles: [],
          coding: {
            naming: {
              functions: 'camelCase',
              classes: 'PascalCase',
              database_tables: 'snake_case',
              database_columns: 'snake_case',
            },
            style: {
              max_function_length: 50,
              require_docstrings: false,
              prefer_composition: true,
            },
          },
          security: {
            authentication: '',
            authorization: '',
            input_validation: '',
            secrets: 'Environment variables only',
          },
          ux: {
            error_format: '',
            loading_states: '',
            accessibility: '',
          },
          constraints: {
            allowed_libraries: [],
            forbidden_libraries: [],
            node_version: '>=20.0.0',
          },
          hooks: {},
          createdAt: now,
          updatedAt: now,
        };
        break;

      case 'basic':
        constitution = {
          version: '1.0',
          principles: [
            'User data privacy is paramount',
            'Fail fast, fail gracefully',
            'Accessibility is not optional',
          ],
          coding: {
            naming: {
              functions: 'camelCase',
              classes: 'PascalCase',
              database_tables: 'snake_case',
              database_columns: 'snake_case',
            },
            style: {
              max_function_length: 50,
              require_docstrings: true,
              prefer_composition: true,
            },
          },
          security: {
            authentication: 'JWT with refresh tokens',
            authorization: 'Role-based access control',
            input_validation: 'Sanitize all user input at API boundary',
            secrets: 'Environment variables only, never hardcode',
          },
          ux: {
            error_format:
              'Include: what went wrong, why, how to fix',
            loading_states: 'Skeleton screens preferred',
            accessibility: 'WCAG 2.1 AA compliance',
          },
          constraints: {
            allowed_libraries: [],
            forbidden_libraries: [],
            node_version: '>=20.0.0',
          },
          hooks: {
            onFeatureSave: [
              { action: 'validateSchema' },
              { action: 'updateChecklist' },
            ],
          },
          createdAt: now,
          updatedAt: now,
        };
        break;

      case 'comprehensive':
        constitution = {
          version: '1.0',
          principles: [
            'User data privacy is paramount',
            'Fail fast, fail gracefully',
            'Accessibility is not optional',
            'Security by design, not as an afterthought',
            'Performance is a feature',
          ],
          coding: {
            naming: {
              functions: 'camelCase',
              classes: 'PascalCase',
              database_tables: 'snake_case',
              database_columns: 'snake_case',
            },
            style: {
              max_function_length: 50,
              require_docstrings: true,
              prefer_composition: true,
            },
          },
          security: {
            authentication: 'JWT with refresh tokens',
            authorization: 'Role-based access control',
            input_validation: 'Sanitize all user input at API boundary',
            secrets: 'Environment variables only, never hardcode',
            password_hashing: 'bcrypt with 12 rounds minimum',
          },
          ux: {
            error_format:
              'Include: what went wrong, why, how to fix',
            loading_states: 'Skeleton screens, not spinners',
            accessibility: 'WCAG 2.1 AA compliance',
            responsive: 'Mobile-first design',
          },
          constraints: {
            allowed_libraries: ['axios', 'lodash', 'date-fns'],
            forbidden_libraries: ['moment.js', 'jquery'],
            node_version: '>=20.0.0',
            typescript: '>=5.0.0',
          },
          hooks: {
            onFeatureSave: [
              { action: 'validateSchema' },
              { action: 'updateChecklist' },
              { action: 'updateProgress' },
            ],
            onSchemaChange: [
              {
                action: 'regenerateAPIs',
                options: { updateFeatureRefs: true },
              },
            ],
            preCommit: [
              {
                action: 'runAnalyzer',
                options: { failOnError: true, failOnWarning: false },
              },
            ],
          },
          createdAt: now,
          updatedAt: now,
        };
        break;

      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }

    await this.saveConstitution(projectPath, constitution);
    return constitution;
  }
}

/**
 * Create singleton instance
 */
let constitutionServiceInstance: ConstitutionService | null = null;

export function getConstitutionService(): ConstitutionService {
  if (!constitutionServiceInstance) {
    constitutionServiceInstance = new ConstitutionService();
  }
  return constitutionServiceInstance;
}

/**
 * Reset singleton instance
 */
export function resetConstitutionService(): void {
  constitutionServiceInstance = null;
}
