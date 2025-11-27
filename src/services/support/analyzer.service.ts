/**
 * AnalyzerService implementation
 * Handles consistency analysis for F9
 */

import path from 'path';
import { getFileService } from '@/services/core/file.service';
import { getFoundryDir } from '@/lib/fs/paths';
import { Feature } from '@/types/domain/feature';
import { Constitution } from '@/types/domain/constitution';
import { generateId } from '@/lib/utils/id';
import {
  saveAnalysisResults,
  getLatestAnalysis,
  type AnalysisResults,
} from '@/lib/db/queries/analysis';

/**
 * Analysis issue severity
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * Analysis issue location
 */
export interface IssueLocation {
  file: string;
  line?: number;
  field?: string;
}

/**
 * Analysis issue
 */
export interface AnalysisIssue {
  id: string;
  ruleId: string;
  severity: IssueSeverity;
  message: string;
  location: IssueLocation;
  suggestion?: string;
  constitutionRef?: string;
  autoFixable: boolean;
}

/**
 * Detailed analysis results
 */
export interface DetailedAnalysisResults {
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    autoFixable: number;
  };
  issues: AnalysisIssue[];
  analyzedAt: string;
}

/**
 * AnalyzerService interface
 */
export interface IAnalyzerService {
  analyze(projectPath: string): Promise<DetailedAnalysisResults>;
  getIssues(
    projectPath: string,
    severity?: IssueSeverity
  ): Promise<AnalysisIssue[]>;
  autoFix(projectPath: string, issueId: string): Promise<void>;
}

/**
 * Analysis rule definition
 */
interface AnalysisRule {
  id: string;
  name: string;
  severity: IssueSeverity;
  check: (context: AnalysisContext) => Promise<AnalysisIssue[]>;
  autoFix?: (issue: AnalysisIssue, context: AnalysisContext) => Promise<void>;
}

/**
 * Analysis context
 */
interface AnalysisContext {
  projectPath: string;
  features: Feature[];
  constitution: Constitution | null;
  fileService: ReturnType<typeof getFileService>;
}

/**
 * AnalyzerService implementation
 */
export class AnalyzerService implements IAnalyzerService {
  private fileService = getFileService();
  private rules: AnalysisRule[] = [];

  constructor() {
    // Register default analysis rules
    this.registerDefaultRules();
  }

  /**
   * Run full analysis on project
   */
  async analyze(projectPath: string): Promise<DetailedAnalysisResults> {
    try {
      // Load project data
      const features = await this.loadFeatures(projectPath);
      const constitution = await this.loadConstitution(projectPath);

      // Build context
      const context: AnalysisContext = {
        projectPath,
        features,
        constitution,
        fileService: this.fileService,
      };

      // Run all rules
      const allIssues: AnalysisIssue[] = [];
      for (const rule of this.rules) {
        const issues = await rule.check(context);
        allIssues.push(...issues);
      }

      // Calculate summary
      const summary = {
        total: allIssues.length,
        errors: allIssues.filter((i) => i.severity === 'error').length,
        warnings: allIssues.filter((i) => i.severity === 'warning').length,
        info: allIssues.filter((i) => i.severity === 'info').length,
        autoFixable: allIssues.filter((i) => i.autoFixable).length,
      };

      const results: DetailedAnalysisResults = {
        summary,
        issues: allIssues,
        analyzedAt: new Date().toISOString(),
      };

      // Save to database
      const status =
        summary.errors > 0
          ? 'errors'
          : summary.warnings > 0
            ? 'warnings'
            : 'valid';

      const analysisRecord: AnalysisResults = {
        id: generateId('analysis'),
        projectId: projectPath,
        scope: 'project',
        status,
        results,
        createdAt: results.analyzedAt,
        expiresAt: null, // Don't expire project-level analysis
      };

      saveAnalysisResults(analysisRecord);

      return results;
    } catch (error) {
      throw new Error(`Failed to analyze project: ${(error as Error).message}`);
    }
  }

  /**
   * Get issues, optionally filtered by severity
   */
  async getIssues(
    projectPath: string,
    severity?: IssueSeverity
  ): Promise<AnalysisIssue[]> {
    try {
      // Get latest analysis
      const latest = getLatestAnalysis(projectPath, 'project');

      if (!latest) {
        // No cached analysis, run new one
        const results = await this.analyze(projectPath);
        return severity
          ? results.issues.filter((i) => i.severity === severity)
          : results.issues;
      }

      const results = latest.results as DetailedAnalysisResults;
      return severity
        ? results.issues.filter((i) => i.severity === severity)
        : results.issues;
    } catch (error) {
      throw new Error(`Failed to get issues: ${(error as Error).message}`);
    }
  }

  /**
   * Auto-fix an issue
   */
  async autoFix(projectPath: string, issueId: string): Promise<void> {
    try {
      // Get all issues
      const issues = await this.getIssues(projectPath);

      // Find the issue
      const issue = issues.find((i) => i.id === issueId);
      if (!issue) {
        throw new Error(`Issue not found: ${issueId}`);
      }

      if (!issue.autoFixable) {
        throw new Error(`Issue ${issueId} is not auto-fixable`);
      }

      // Find the rule
      const rule = this.rules.find((r) => r.id === issue.ruleId);
      if (!rule || !rule.autoFix) {
        throw new Error(`No auto-fix available for rule ${issue.ruleId}`);
      }

      // Load context
      const features = await this.loadFeatures(projectPath);
      const constitution = await this.loadConstitution(projectPath);

      const context: AnalysisContext = {
        projectPath,
        features,
        constitution,
        fileService: this.fileService,
      };

      // Apply fix
      await rule.autoFix(issue, context);

      // Re-run analysis to update cache
      await this.analyze(projectPath);
    } catch (error) {
      throw new Error(`Failed to auto-fix issue: ${(error as Error).message}`);
    }
  }

  /**
   * Register default analysis rules
   */
  private registerDefaultRules(): void {
    // Rule: Check for orphaned features (no references)
    this.rules.push({
      id: 'orphaned-feature',
      name: 'Orphaned Feature',
      severity: 'warning',
      check: async (context) => {
        const issues: AnalysisIssue[] = [];

        // Find features with no schema, API, or component refs
        for (const feature of context.features) {
          const hasRefs =
            feature.technical &&
            (feature.technical.schemaRefs.length > 0 ||
              feature.technical.apiRefs.length > 0 ||
              feature.technical.componentRefs.length > 0);

          if (!hasRefs) {
            issues.push({
              id: generateId('issue'),
              ruleId: 'orphaned-feature',
              severity: 'warning',
              message: `Feature "${feature.name}" has no schema, API, or component references`,
              location: {
                file: `features/${feature.id}.yaml`,
                field: 'technical',
              },
              suggestion:
                'Add references to related entities, endpoints, or components',
              autoFixable: false,
            });
          }
        }

        return issues;
      },
    });

    // Rule: Check for circular dependencies
    this.rules.push({
      id: 'circular-dependency',
      name: 'Circular Dependency',
      severity: 'warning',
      check: async (context) => {
        const issues: AnalysisIssue[] = [];

        // Build dependency graph
        const graph = new Map<string, Set<string>>();
        for (const feature of context.features) {
          graph.set(
            feature.id,
            new Set(feature.dependencies || [])
          );
        }

        // Detect cycles using DFS
        const visited = new Set<string>();
        const recStack = new Set<string>();

        const hasCycle = (
          nodeId: string,
          path: string[]
        ): string[] | null => {
          if (recStack.has(nodeId)) {
            // Found cycle
            const cycleStart = path.indexOf(nodeId);
            return path.slice(cycleStart);
          }

          if (visited.has(nodeId)) {
            return null;
          }

          visited.add(nodeId);
          recStack.add(nodeId);
          path.push(nodeId);

          const neighbors = graph.get(nodeId) || new Set();
          for (const neighbor of neighbors) {
            const cycle = hasCycle(neighbor, [...path]);
            if (cycle) {
              return cycle;
            }
          }

          recStack.delete(nodeId);
          return null;
        };

        // Check each feature
        const detectedCycles = new Set<string>();
        for (const feature of context.features) {
          const cycle = hasCycle(feature.id, []);
          if (cycle) {
            const cycleKey = cycle.sort().join('->');
            if (!detectedCycles.has(cycleKey)) {
              detectedCycles.add(cycleKey);

              const featureNames = cycle.map(
                (id) =>
                  context.features.find((f) => f.id === id)?.name || id
              );

              issues.push({
                id: generateId('issue'),
                ruleId: 'circular-dependency',
                severity: 'warning',
                message: `Circular dependency detected: ${featureNames.join(' → ')}`,
                location: {
                  file: `features/${feature.id}.yaml`,
                  field: 'dependencies',
                },
                suggestion:
                  'Consider refactoring to remove circular dependencies',
                autoFixable: false,
              });
            }
          }
        }

        return issues;
      },
    });

    // Rule: Naming consistency (if constitution defines rules)
    this.rules.push({
      id: 'naming-convention',
      name: 'Naming Convention',
      severity: 'warning',
      check: async (context) => {
        const issues: AnalysisIssue[] = [];

        // Only check if constitution exists and has naming rules
        if (!context.constitution?.coding?.naming) {
          return issues;
        }

        const naming = context.constitution.coding.naming;

        // Happy path: Check database table and column naming
        // Load DBML schemas and validate naming conventions
        await this.checkDatabaseNaming(context, naming, issues);

        // Check function/class naming in features
        await this.checkFeatureNaming(context, naming, issues);

        return issues;
      },
    });

    // Rule: Missing implementation plan
    this.rules.push({
      id: 'missing-implementation-plan',
      name: 'Missing Implementation Plan',
      severity: 'info',
      check: async (context) => {
        const issues: AnalysisIssue[] = [];

        for (const feature of context.features) {
          if (
            !feature.implemented &&
            (!feature.implementationPlan ||
              feature.implementationPlan.length === 0)
          ) {
            issues.push({
              id: generateId('issue'),
              ruleId: 'missing-implementation-plan',
              severity: 'info',
              message: `Feature "${feature.name}" has no implementation plan`,
              location: {
                file: `features/${feature.id}.yaml`,
                field: 'implementationPlan',
              },
              suggestion:
                'Add implementation steps to guide development',
              autoFixable: false,
            });
          }
        }

        return issues;
      },
    });

    // Rule: Incomplete acceptance criteria
    this.rules.push({
      id: 'incomplete-acceptance-criteria',
      name: 'Incomplete Acceptance Criteria',
      severity: 'info',
      check: async (context) => {
        const issues: AnalysisIssue[] = [];

        for (const feature of context.features) {
          if (
            !feature.business?.acceptanceCriteria ||
            feature.business.acceptanceCriteria.length === 0
          ) {
            issues.push({
              id: generateId('issue'),
              ruleId: 'incomplete-acceptance-criteria',
              severity: 'info',
              message: `Feature "${feature.name}" has no acceptance criteria`,
              location: {
                file: `features/${feature.id}.yaml`,
                field: 'business.acceptanceCriteria',
              },
              suggestion:
                'Define acceptance criteria for quality gates',
              autoFixable: false,
            });
          }
        }

        return issues;
      },
    });
  }

  /**
   * Load all features
   */
  private async loadFeatures(projectPath: string): Promise<Feature[]> {
    const features: Feature[] = [];
    const featuresDir = path.join(getFoundryDir(projectPath), 'features');

    try {
      const exists = await this.fileService.exists(featuresDir);
      if (!exists) {
        return features;
      }

      const files = await this.fileService.list(featuresDir, '**/*.yaml');

      for (const file of files) {
        try {
          const feature = await this.fileService.readYaml<Feature>(file);
          features.push(feature);
        } catch (error) {
          // Skip invalid feature files
          console.warn(`Failed to load feature ${file}:`, error);
        }
      }

      return features;
    } catch (error) {
      console.warn('Failed to load features:', error);
      return features;
    }
  }

  /**
   * Load constitution
   */
  private async loadConstitution(
    projectPath: string
  ): Promise<Constitution | null> {
    try {
      const constitutionPath = path.join(
        getFoundryDir(projectPath),
        'constitution.yaml'
      );
      const exists = await this.fileService.exists(constitutionPath);

      if (!exists) {
        return null;
      }

      return await this.fileService.readYaml<Constitution>(constitutionPath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check database naming conventions
   */
  private async checkDatabaseNaming(
    context: AnalysisContext,
    naming: any,
    issues: AnalysisIssue[]
  ): Promise<void> {
    // Happy path: Load schemas and check table/column names
    try {
      const schemasDir = path.join(getFoundryDir(context.projectPath), 'schemas');
      const exists = await this.fileService.exists(schemasDir);

      if (!exists) {
        return; // No schemas to check
      }

      const schemaFiles = await this.fileService.list(schemasDir, '**/*.yaml');

      for (const schemaFile of schemaFiles) {
        try {
          const schema = await this.fileService.readYaml<any>(schemaFile);

          // Check if schema has entities
          if (!schema.entities || !Array.isArray(schema.entities)) {
            continue;
          }

          // Check table names
          for (const entity of schema.entities) {
            if (!this.matchesNamingConvention(entity.name, naming.database_tables)) {
              issues.push({
                id: generateId('issue'),
                ruleId: 'naming-convention',
                severity: 'warning',
                message: `Table name "${entity.name}" doesn't follow convention: ${naming.database_tables}`,
                location: {
                  file: schemaFile,
                  field: `entities.${entity.name}`,
                },
                suggestion: `Use ${naming.database_tables} for table names`,
                constitutionRef: 'coding.naming.database_tables',
                autoFixable: false,
              });
            }

            // Check column names
            if (entity.fields && Array.isArray(entity.fields)) {
              for (const field of entity.fields) {
                if (!this.matchesNamingConvention(field.name, naming.database_columns)) {
                  issues.push({
                    id: generateId('issue'),
                    ruleId: 'naming-convention',
                    severity: 'warning',
                    message: `Column name "${field.name}" doesn't follow convention: ${naming.database_columns}`,
                    location: {
                      file: schemaFile,
                      field: `entities.${entity.name}.fields.${field.name}`,
                    },
                    suggestion: `Use ${naming.database_columns} for column names`,
                    constitutionRef: 'coding.naming.database_columns',
                    autoFixable: false,
                  });
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid schema files
          console.warn(`Failed to check schema ${schemaFile}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to check database naming:', error);
    }
  }

  /**
   * Check feature naming conventions
   */
  private async checkFeatureNaming(
    context: AnalysisContext,
    naming: any,
    issues: AnalysisIssue[]
  ): Promise<void> {
    // Happy path: Check feature names follow conventions
    // For now, we'll just check that feature IDs follow kebab-case
    for (const feature of context.features) {
      // Feature IDs should be kebab-case (already enforced by ID generation)
      // We could add checks for other naming patterns here

      // Check if feature name is in PascalCase (common for class names)
      if (naming.classes && !this.matchesNamingConvention(feature.name, naming.classes)) {
        // Only warn if the feature represents a class/component
        if (feature.technical?.componentRefs && feature.technical.componentRefs.length > 0) {
          issues.push({
            id: generateId('issue'),
            ruleId: 'naming-convention',
            severity: 'info',
            message: `Feature name "${feature.name}" might not follow class convention: ${naming.classes}`,
            location: {
              file: `features/${feature.id}.yaml`,
              field: 'name',
            },
            suggestion: `Consider using ${naming.classes} for component-based features`,
            constitutionRef: 'coding.naming.classes',
            autoFixable: false,
          });
        }
      }
    }
  }

  /**
   * Check if a name matches a naming convention
   */
  private matchesNamingConvention(name: string, convention: string): boolean {
    // Happy path: Basic convention checking
    switch (convention.toLowerCase()) {
      case 'camelcase':
        // camelCase: starts lowercase, no underscores, no hyphens
        return /^[a-z][a-zA-Z0-9]*$/.test(name);

      case 'pascalcase':
        // PascalCase: starts uppercase, no underscores, no hyphens
        return /^[A-Z][a-zA-Z0-9]*$/.test(name);

      case 'snake_case':
        // snake_case: all lowercase with underscores
        return /^[a-z][a-z0-9_]*$/.test(name);

      case 'kebab-case':
        // kebab-case: all lowercase with hyphens
        return /^[a-z][a-z0-9-]*$/.test(name);

      case 'screaming_snake_case':
        // SCREAMING_SNAKE_CASE: all uppercase with underscores
        return /^[A-Z][A-Z0-9_]*$/.test(name);

      default:
        // Unknown convention, assume it matches
        console.warn(`Unknown naming convention: ${convention}`);
        return true;
    }
  }

  /**
   * Register a custom rule
   */
  registerRule(rule: AnalysisRule): void {
    this.rules.push(rule);
  }
}

/**
 * Create singleton instance
 */
let analyzerServiceInstance: AnalyzerService | null = null;

export function getAnalyzerService(): AnalyzerService {
  if (!analyzerServiceInstance) {
    analyzerServiceInstance = new AnalyzerService();
  }
  return analyzerServiceInstance;
}

/**
 * Reset singleton instance
 */
export function resetAnalyzerService(): void {
  analyzerServiceInstance = null;
}
