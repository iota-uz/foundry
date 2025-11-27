/**
 * ValidationService - Validates artifacts (DBML, OpenAPI, GraphQL) and reference integrity
 */

import { Parser } from '@dbml/core';
import { buildSchema, GraphQLError } from 'graphql';
import { Feature } from '@/types';
import { SpecService } from './spec.service';

/**
 * Validation result for any artifact
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  path?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
  path?: string;
}

/**
 * Reference integrity result
 */
export interface ReferenceCheckResult {
  valid: boolean;
  brokenReferences: BrokenReference[];
  orphanedArtifacts: OrphanedArtifact[];
  circularDependencies: CircularDependency[];
}

/**
 * Broken reference details
 */
export interface BrokenReference {
  sourceType: 'feature' | 'component';
  sourceId: string;
  targetType: 'schema' | 'api' | 'component' | 'feature';
  targetId: string;
  message: string;
}

/**
 * Orphaned artifact (not referenced by any feature)
 */
export interface OrphanedArtifact {
  type: 'schema' | 'api' | 'component';
  id: string;
  message: string;
}

/**
 * Circular dependency details
 */
export interface CircularDependency {
  cycle: string[];
  message: string;
}

/**
 * ValidationService interface
 */
export interface IValidationService {
  // Artifact validation
  validateDBML(dbml: string): ValidationResult;
  validateOpenAPI(spec: string | Record<string, unknown>): Promise<ValidationResult>;
  validateGraphQL(schema: string): ValidationResult;
  validateFeature(feature: Feature): ValidationResult;

  // Reference integrity
  validateReferences(projectPath: string): Promise<ReferenceCheckResult>;
}

/**
 * ValidationService implementation
 */
export class ValidationService implements IValidationService {
  constructor(private specService: SpecService) {}

  // ==================== DBML VALIDATION ====================

  validateDBML(dbml: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!dbml || dbml.trim() === '') {
      return {
        valid: true,
        errors: [],
        warnings: [
          {
            code: 'EMPTY_SCHEMA',
            message: 'Schema is empty',
          },
        ],
      };
    }

    try {
      // Use @dbml/core parser to validate
      const parser = new Parser();
      const database = parser.parse(dbml, 'dbml');

      // Get all tables from all schemas
      const allTables = database.schemas.flatMap((schema) => schema.tables);

      // Additional validation checks
      if (allTables.length === 0) {
        warnings.push({
          code: 'NO_TABLES',
          message: 'No tables defined in schema',
        });
      }

      // Check for tables without primary keys
      for (const table of allTables) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasPrimaryKey = table.fields.some((field: any) =>
          field.pk || field.dbState?.pk
        );

        if (!hasPrimaryKey) {
          warnings.push({
            code: 'NO_PRIMARY_KEY',
            message: `Table '${table.name}' has no primary key`,
            path: table.name,
          });
        }

        // Check for empty tables
        if (table.fields.length === 0) {
          errors.push({
            code: 'EMPTY_TABLE',
            message: `Table '${table.name}' has no fields`,
            path: table.name,
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      // Parse error from @dbml/core
      const err = error as Error;
      const errorMessage = err.message;

      // Try to extract line number from error message
      const lineMatch = errorMessage.match(/line (\d+)/i);
      const line = lineMatch?.[1] ? parseInt(lineMatch[1], 10) : undefined;

      return {
        valid: false,
        errors: [
          {
            code: 'PARSE_ERROR',
            message: errorMessage,
            ...(line !== undefined && { line }),
          },
        ],
        warnings: [],
      };
    }
  }

  // ==================== OPENAPI VALIDATION ====================

  async validateOpenAPI(spec: string | Record<string, unknown>): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      let specObj: Record<string, unknown>;

      if (typeof spec === 'string') {
        // If AI validation is needed, we could use Claude here
        // For now, just check basic JSON/YAML parsing
        try {
          specObj = JSON.parse(spec);
        } catch {
          return {
            valid: false,
            errors: [
              {
                code: 'INVALID_JSON',
                message: 'OpenAPI spec is not valid JSON',
              },
            ],
            warnings: [],
          };
        }
      } else {
        specObj = spec;
      }

      // Basic OpenAPI structure validation
      if (!specObj.openapi && !specObj.swagger) {
        errors.push({
          code: 'MISSING_VERSION',
          message: 'Missing openapi or swagger version field',
        });
      }

      if (!specObj.info) {
        errors.push({
          code: 'MISSING_INFO',
          message: 'Missing info object',
        });
      } else {
        const info = specObj.info as Record<string, unknown>;
        if (!info.title) {
          errors.push({
            code: 'MISSING_TITLE',
            message: 'Missing info.title',
            path: 'info.title',
          });
        }
        if (!info.version) {
          errors.push({
            code: 'MISSING_VERSION',
            message: 'Missing info.version',
            path: 'info.version',
          });
        }
      }

      if (!specObj.paths) {
        warnings.push({
          code: 'NO_PATHS',
          message: 'No paths defined in spec',
        });
      } else if (Object.keys(specObj.paths).length === 0) {
        warnings.push({
          code: 'EMPTY_PATHS',
          message: 'Paths object is empty',
        });
      }

      // Validate path structure
      if (specObj.paths) {
        for (const [path, pathItem] of Object.entries(specObj.paths)) {
          if (!path.startsWith('/')) {
            errors.push({
              code: 'INVALID_PATH',
              message: `Path '${path}' must start with /`,
              path,
            });
          }

          // Check if path item has at least one operation
          const pathItemObj = pathItem as Record<string, unknown>;
          const operations = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
          const hasOperation = operations.some((op) => pathItemObj[op]);

          if (!hasOperation) {
            warnings.push({
              code: 'NO_OPERATIONS',
              message: `Path '${path}' has no operations defined`,
              path,
            });
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message: (error as Error).message,
          },
        ],
        warnings: [],
      };
    }
  }

  // ==================== GRAPHQL VALIDATION ====================

  validateGraphQL(schema: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!schema || schema.trim() === '') {
      return {
        valid: true,
        errors: [],
        warnings: [
          {
            code: 'EMPTY_SCHEMA',
            message: 'GraphQL schema is empty',
          },
        ],
      };
    }

    try {
      // Use graphql buildSchema to validate
      const builtSchema = buildSchema(schema);

      // Check for Query type
      const queryType = builtSchema.getQueryType();
      if (!queryType) {
        warnings.push({
          code: 'NO_QUERY_TYPE',
          message: 'Schema has no Query type defined',
        });
      }

      // Check for Mutation type
      const mutationType = builtSchema.getMutationType();
      if (!mutationType) {
        warnings.push({
          code: 'NO_MUTATION_TYPE',
          message: 'Schema has no Mutation type defined',
        });
      }

      // Check for empty Query/Mutation types
      if (queryType && Object.keys(queryType.getFields()).length === 0) {
        warnings.push({
          code: 'EMPTY_QUERY_TYPE',
          message: 'Query type has no fields',
        });
      }

      if (mutationType && Object.keys(mutationType.getFields()).length === 0) {
        warnings.push({
          code: 'EMPTY_MUTATION_TYPE',
          message: 'Mutation type has no fields',
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      const err = error as GraphQLError;

      // Extract location information if available
      const location = err.locations?.[0];

      return {
        valid: false,
        errors: [
          {
            code: 'PARSE_ERROR',
            message: err.message,
            ...(location?.line !== undefined && { line: location.line }),
            ...(location?.column !== undefined && { column: location.column }),
          },
        ],
        warnings: [],
      };
    }
  }

  // ==================== FEATURE VALIDATION ====================

  validateFeature(feature: Feature): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!feature.id) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Feature missing id',
      });
    }

    if (!feature.name || feature.name.trim() === '') {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Feature missing name',
      });
    }

    if (!feature.description || feature.description.trim() === '') {
      warnings.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Feature missing description',
      });
    }

    // Business requirements validation (CPO phase)
    if (feature.phase !== 'cpo' && !feature.business) {
      warnings.push({
        code: 'MISSING_BUSINESS_REQUIREMENTS',
        message: 'Feature missing business requirements from CPO phase',
      });
    }

    if (feature.business) {
      if (!feature.business.userStory) {
        warnings.push({
          code: 'MISSING_USER_STORY',
          message: 'Feature missing user story',
        });
      }

      if (!feature.business.acceptanceCriteria || feature.business.acceptanceCriteria.length === 0) {
        warnings.push({
          code: 'MISSING_ACCEPTANCE_CRITERIA',
          message: 'Feature missing acceptance criteria',
        });
      }
    }

    // Technical requirements validation (CTO phase)
    if (feature.phase === 'complete' && !feature.technical) {
      warnings.push({
        code: 'MISSING_TECHNICAL_REQUIREMENTS',
        message: 'Completed feature missing technical requirements',
      });
    }

    // Implementation plan
    if (feature.phase === 'complete' && feature.implementationPlan.length === 0) {
      warnings.push({
        code: 'MISSING_IMPLEMENTATION_PLAN',
        message: 'Completed feature missing implementation plan',
      });
    }

    // Task progress consistency
    if (feature.tasks.length !== feature.taskProgress.total) {
      errors.push({
        code: 'TASK_PROGRESS_MISMATCH',
        message: `Task count (${feature.tasks.length}) does not match taskProgress.total (${feature.taskProgress.total})`,
      });
    }

    // Checklist progress consistency
    if (feature.checklist.length !== feature.checklistProgress.total) {
      errors.push({
        code: 'CHECKLIST_PROGRESS_MISMATCH',
        message: `Checklist count (${feature.checklist.length}) does not match checklistProgress.total (${feature.checklistProgress.total})`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==================== REFERENCE INTEGRITY ====================

  async validateReferences(projectPath: string): Promise<ReferenceCheckResult> {
    const brokenReferences: BrokenReference[] = [];
    const orphanedArtifacts: OrphanedArtifact[] = [];
    const circularDependencies: CircularDependency[] = [];

    try {
      // Get all features and components
      const features = await this.specService.listFeatures(projectPath);
      const components = await this.specService.listComponents(projectPath);

      // Get artifacts
      const dbmlSchema = await this.specService.getSchema(projectPath);
      const openApiSpec = await this.specService.getOpenAPI(projectPath);
      const graphqlSchema = await this.specService.getGraphQL(projectPath);

      // Parse schema entities
      const schemaEntities = new Set<string>();
      if (dbmlSchema) {
        try {
          const parser = new Parser();
          const database = parser.parse(dbmlSchema, 'dbml');
          const allTables = database.schemas.flatMap((schema) => schema.tables);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allTables.forEach((table: any) => schemaEntities.add(table.name));
        } catch {
          // Ignore parse errors - they'll be caught by validateDBML
        }
      }

      // Parse API endpoints
      const apiEndpoints = new Set<string>();
      if (openApiSpec?.paths) {
        Object.keys(openApiSpec.paths).forEach((path) => {
          apiEndpoints.add(path);
        });
      }

      // Parse GraphQL operations
      const graphqlOperations = new Set<string>();
      if (graphqlSchema) {
        try {
          const schema = buildSchema(graphqlSchema);
          const queryType = schema.getQueryType();
          const mutationType = schema.getMutationType();

          if (queryType) {
            Object.keys(queryType.getFields()).forEach((field) => {
              graphqlOperations.add(`query ${field}`);
            });
          }

          if (mutationType) {
            Object.keys(mutationType.getFields()).forEach((field) => {
              graphqlOperations.add(`mutation ${field}`);
            });
          }
        } catch {
          // Ignore parse errors - they'll be caught by validateGraphQL
        }
      }

      // Check feature references
      for (const feature of features) {
        // Check schema references
        if (feature.technical?.schemaRefs) {
          for (const ref of feature.technical.schemaRefs) {
            if (!schemaEntities.has(ref.entity)) {
              brokenReferences.push({
                sourceType: 'feature',
                sourceId: feature.id,
                targetType: 'schema',
                targetId: ref.entity,
                message: `Feature '${feature.name}' references non-existent schema entity '${ref.entity}'`,
              });
            }
          }
        }

        // Check API references
        if (feature.technical?.apiRefs) {
          for (const ref of feature.technical.apiRefs) {
            if (ref.type === 'rest' && ref.path && !apiEndpoints.has(ref.path)) {
              brokenReferences.push({
                sourceType: 'feature',
                sourceId: feature.id,
                targetType: 'api',
                targetId: ref.path,
                message: `Feature '${feature.name}' references non-existent REST endpoint '${ref.path}'`,
              });
            }

            if (ref.type === 'graphql' && ref.operation && !graphqlOperations.has(ref.operation)) {
              brokenReferences.push({
                sourceType: 'feature',
                sourceId: feature.id,
                targetType: 'api',
                targetId: ref.operation,
                message: `Feature '${feature.name}' references non-existent GraphQL operation '${ref.operation}'`,
              });
            }
          }
        }

        // Check component references
        if (feature.technical?.componentRefs) {
          for (const ref of feature.technical.componentRefs) {
            const componentExists = components.some((c) => c.id === ref.id);
            if (!componentExists) {
              brokenReferences.push({
                sourceType: 'feature',
                sourceId: feature.id,
                targetType: 'component',
                targetId: ref.id,
                message: `Feature '${feature.name}' references non-existent component '${ref.id}'`,
              });
            }
          }
        }

        // Check feature dependencies
        for (const depId of feature.dependencies) {
          const dependencyExists = features.some((f) => f.id === depId);
          if (!dependencyExists) {
            brokenReferences.push({
              sourceType: 'feature',
              sourceId: feature.id,
              targetType: 'feature',
              targetId: depId,
              message: `Feature '${feature.name}' depends on non-existent feature '${depId}'`,
            });
          }
        }
      }

      // Check for circular dependencies
      const cycles = this.findCircularDependencies(features);
      for (const cycle of cycles) {
        circularDependencies.push({
          cycle,
          message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        });
      }

      // Check for orphaned components (not referenced by any feature)
      for (const component of components) {
        const isReferenced = features.some(
          (f) => f.technical?.componentRefs?.some((ref) => ref.id === component.id)
        );

        if (!isReferenced) {
          orphanedArtifacts.push({
            type: 'component',
            id: component.id,
            message: `Component '${component.name}' is not referenced by any feature`,
          });
        }
      }

      return {
        valid: brokenReferences.length === 0 && circularDependencies.length === 0,
        brokenReferences,
        orphanedArtifacts,
        circularDependencies,
      };
    } catch (error) {
      throw new Error(`Reference validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Find circular dependencies using depth-first search
   * Fixed: Uses recursion stack per DFS to detect all cycles, not just first traversal
   */
  private findCircularDependencies(features: Feature[]): string[][] {
    const cycles: string[][] = [];
    const featureMap = new Map(features.map((f) => [f.id, f]));
    const cycleSet = new Set<string>(); // Track unique cycles

    const dfs = (featureId: string, path: string[], recursionStack: Set<string>) => {
      recursionStack.add(featureId);

      const feature = featureMap.get(featureId);
      if (feature) {
        for (const depId of feature.dependencies) {
          if (recursionStack.has(depId)) {
            // Found a cycle
            const cycleStart = path.indexOf(depId);
            const cycle = path.slice(cycleStart);
            cycle.push(depId); // Complete the cycle

            // Store cycle as sorted string to avoid duplicates
            const cycleKey = [...cycle].sort().join('->');
            if (!cycleSet.has(cycleKey)) {
              cycleSet.add(cycleKey);
              cycles.push(cycle);
            }
          } else if (!recursionStack.has(depId)) {
            // Continue exploring
            dfs(depId, [...path, featureId], recursionStack);
          }
        }
      }

      recursionStack.delete(featureId);
    };

    // Start DFS from each feature to find all cycles
    for (const feature of features) {
      dfs(feature.id, [], new Set<string>());
    }

    return cycles;
  }
}

/**
 * Create singleton instance
 */
let validationServiceInstance: ValidationService | null = null;

export function getValidationService(specService: SpecService): ValidationService {
  if (!validationServiceInstance) {
    validationServiceInstance = new ValidationService(specService);
  }
  return validationServiceInstance;
}
