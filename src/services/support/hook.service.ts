/**
 * HookService implementation
 * Handles event-driven hooks from F12 spec
 */

import { HookActionType, Constitution } from '@/types/domain/constitution';

/**
 * Hook events that can trigger actions
 */
export type HookEvent =
  | 'onFeatureSave'
  | 'onSchemaChange'
  | 'onAPIChange'
  | 'onComponentChange'
  | 'preCommit';

/**
 * Context passed to hook execution
 */
export interface HookContext {
  projectPath: string;
  artifactId?: string;
  artifactType?: string;
  changes?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Result of hook action execution
 */
export interface HookResult {
  action: HookActionType;
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * Hook configuration
 */
export interface HookConfig {
  event: HookEvent;
  action: HookActionType;
  options?: Record<string, unknown>;
}

/**
 * Hook action handler function
 */
export type HookActionHandler = (
  context: HookContext,
  options?: Record<string, unknown>
) => Promise<HookResult>;

/**
 * HookService interface
 */
export interface IHookService {
  executeHooks(event: HookEvent, context: HookContext): Promise<HookResult[]>;
  registerAction(name: HookActionType, handler: HookActionHandler): void;
  getHooksForEvent(event: HookEvent): HookConfig[];
  setConstitution(constitution: Constitution | null): void;
}

/**
 * HookService implementation
 */
export class HookService implements IHookService {
  private constitution: Constitution | null = null;
  private actionHandlers: Map<HookActionType, HookActionHandler> = new Map();

  constructor() {
    // Register default action handlers
    this.registerDefaultActions();
  }

  /**
   * Set constitution for hook configuration
   */
  setConstitution(constitution: Constitution | null): void {
    this.constitution = constitution;
  }

  /**
   * Get hooks configured for a specific event
   */
  getHooksForEvent(event: HookEvent): HookConfig[] {
    if (!this.constitution || !this.constitution.hooks) {
      return [];
    }

    const hookActions = this.constitution.hooks[event];
    if (!hookActions || !Array.isArray(hookActions)) {
      return [];
    }

    return hookActions.map((hookAction): HookConfig => ({
      event,
      action: hookAction.action,
      ...(hookAction.options && { options: hookAction.options }),
    }));
  }

  /**
   * Execute all hooks for an event
   */
  async executeHooks(
    event: HookEvent,
    context: HookContext
  ): Promise<HookResult[]> {
    const hooks = this.getHooksForEvent(event);
    const results: HookResult[] = [];

    for (const hook of hooks) {
      try {
        const handler = this.actionHandlers.get(hook.action);

        if (!handler) {
          results.push({
            action: hook.action,
            success: false,
            error: `No handler registered for action: ${hook.action}`,
          });
          continue;
        }

        // Execute the action
        const result = await handler(context, hook.options);
        results.push(result);

        // If failOnError is set and action failed, stop execution
        if (!result.success && hook.options?.failOnError) {
          break;
        }
      } catch (error) {
        results.push({
          action: hook.action,
          success: false,
          error: (error as Error).message,
        });

        // Stop on error if failOnError is set
        if (hook.options?.failOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Register a hook action handler
   */
  registerAction(name: HookActionType, handler: HookActionHandler): void {
    this.actionHandlers.set(name, handler);
  }

  /**
   * Register default action handlers
   */
  private registerDefaultActions(): void {
    // validateSchema action
    this.registerAction('validateSchema', async (context, options) => {
      try {
        const { getFileService } = await import('@/services/core/file.service');
        const { getSpecService } = await import('@/services/core/spec.service');
        const { getValidationService } = await import('@/services/core/validation.service');

        const fileService = getFileService();
        const specService = getSpecService(fileService);
        const validationService = getValidationService(specService);

        const artifactType = context.artifactType || options?.artifactType;

        if (!artifactType) {
          throw new Error('Artifact type is required');
        }

        let result;

        switch (artifactType) {
          case 'schema':
          case 'dbml':
            const schema = await specService.getSchema(context.projectPath);
            result = validationService.validateDBML(schema);
            break;

          case 'openapi':
          case 'api':
            const openapi = await specService.getOpenAPI(context.projectPath);
            result = await validationService.validateOpenAPI(openapi);
            break;

          case 'graphql':
            const graphql = await specService.getGraphQL(context.projectPath);
            result = validationService.validateGraphQL(graphql);
            break;

          default:
            throw new Error(`Unsupported artifact type for validation: ${artifactType}`);
        }

        if (!result.valid) {
          return {
            action: 'validateSchema',
            success: false,
            error: `Validation failed with ${result.errors.length} errors`,
            data: {
              errors: result.errors,
              warnings: result.warnings,
            },
          };
        }

        return {
          action: 'validateSchema',
          success: true,
          message: 'Schema validation passed',
          data: {
            warnings: result.warnings,
          },
        };
      } catch (error) {
        return {
          action: 'validateSchema',
          success: false,
          error: (error as Error).message,
        };
      }
    });

    // updateChecklist action
    this.registerAction('updateChecklist', async (context, _options) => {
      try {
        const { getFileService } = await import('@/services/core/file.service');
        const { getSpecService } = await import('@/services/core/spec.service');

        const fileService = getFileService();
        const specService = getSpecService(fileService);

        // Extract feature info from context
        const { artifactId, projectPath } = context;

        if (!artifactId) {
          throw new Error('Feature ID is required');
        }

        // Load all features to find the one we need
        const features = await specService.listFeatures(projectPath);
        const feature = features.find(f => f.id === artifactId);

        if (!feature) {
          throw new Error(`Feature not found: ${artifactId}`);
        }

        // Regenerate checklist from acceptance criteria
        const checklist = feature.business?.acceptanceCriteria?.map(criteria => ({
          id: `check_${Math.random().toString(36).substr(2, 9)}`,
          criterion: criteria,
          verified: false,
          source: 'generated' as const,
        })) || [];

        // Calculate progress
        const checklistProgress = {
          total: checklist.length,
          verified: checklist.filter(c => c.verified).length,
          percentComplete: checklist.length > 0
            ? Math.round((checklist.filter(c => c.verified).length / checklist.length) * 100)
            : 0,
        };

        // Update feature with new checklist
        const moduleSlug = (context.changes?.moduleSlug as string | undefined) || 'core';
        const featureSlug = (context.changes?.featureSlug as string | undefined) || 'default';

        await specService.updateFeature(projectPath, moduleSlug, featureSlug, {
          checklist,
          checklistProgress,
        });

        return {
          action: 'updateChecklist',
          success: true,
          message: `Checklist updated with ${checklist.length} items`,
          data: {
            checklistCount: checklist.length,
            checklistProgress,
          },
        };
      } catch (error) {
        return {
          action: 'updateChecklist',
          success: false,
          error: (error as Error).message,
        };
      }
    });

    // regenerateAPIs action
    this.registerAction('regenerateAPIs', async (context, options) => {
      try {
        const { getFileService } = await import('@/services/core/file.service');
        const { getSpecService } = await import('@/services/core/spec.service');
        const { getLLMService } = await import('@/services/ai/llm.service');

        const fileService = getFileService();
        const specService = getSpecService(fileService);
        const llmService = getLLMService();

        const schema = await specService.getSchema(context.projectPath);
        const features = await specService.listFeatures(context.projectPath);

        if (!schema) {
          throw new Error('No schema found to generate APIs from');
        }

        // Extract endpoints from features
        const endpoints: unknown[] = [];
        for (const feature of features) {
          if (feature.technical?.apiRefs) {
            endpoints.push(...feature.technical.apiRefs);
          }
        }

        // Determine API style
        const apiStyle = (options?.apiStyle as string | undefined) || 'rest';

        if (apiStyle === 'rest' || apiStyle === 'openapi') {
          // Generate OpenAPI spec
          const response = await llmService.call({
            model: 'sonnet',
            systemPrompt: `You are an API architect. Generate a complete OpenAPI 3.0 specification based on the provided database schema and endpoints.`,
            userPrompt: `Database Schema:\n${schema}\n\nRequired Endpoints:\n${JSON.stringify(endpoints, null, 2)}\n\nGenerate a complete OpenAPI spec.`,
            maxTokens: 4000,
          });

          // Extract YAML from response
          let apiSpec = response.content;
          const yamlMatch = apiSpec.match(/```(?:yaml|yml)?\s*\n?([\s\S]*?)\n?```/);
          if (yamlMatch) {
            apiSpec = yamlMatch[1] || '';
          }

          // Parse and save
          const YAML = await import('js-yaml');
          const spec = YAML.load(apiSpec) as Record<string, unknown>;
          await specService.updateOpenAPI(context.projectPath, spec);
        } else if (apiStyle === 'graphql') {
          // Generate GraphQL schema
          const response = await llmService.call({
            model: 'sonnet',
            systemPrompt: `You are a GraphQL schema architect. Generate a complete GraphQL schema based on the provided database schema.`,
            userPrompt: `Database Schema:\n${schema}\n\nGenerate a complete GraphQL schema with Query and Mutation types.`,
            maxTokens: 4000,
          });

          // Extract GraphQL schema from response
          let graphqlSchema = response.content;
          const gqlMatch = graphqlSchema.match(/```(?:graphql)?\s*\n?([\s\S]*?)\n?```/);
          if (gqlMatch) {
            graphqlSchema = gqlMatch[1] || '';
          }

          await specService.updateGraphQL(context.projectPath, graphqlSchema.trim());
        }

        return {
          action: 'regenerateAPIs',
          success: true,
          message: `${apiStyle.toUpperCase()} API regenerated successfully`,
          data: {
            apiStyle,
            endpointCount: endpoints.length,
          },
        };
      } catch (error) {
        return {
          action: 'regenerateAPIs',
          success: false,
          error: (error as Error).message,
        };
      }
    });

    // runAnalyzer action
    this.registerAction('runAnalyzer', async (context, options) => {
      try {
        const { getFileService } = await import('@/services/core/file.service');
        const { getSpecService } = await import('@/services/core/spec.service');
        const { getValidationService } = await import('@/services/core/validation.service');
        const { getDatabaseService } = await import('@/services/core/database.service');

        const fileService = getFileService();
        const specService = getSpecService(fileService);
        const validationService = getValidationService(specService);
        const dbService = getDatabaseService();

        const scope = (options?.scope as string | undefined) || 'full';
        const projectPath = context.projectPath;

        // Run reference validation
        const refResult = await validationService.validateReferences(projectPath);

        // Validate artifacts
        const schema = await specService.getSchema(projectPath);
        const openapi = await specService.getOpenAPI(projectPath);
        const graphql = await specService.getGraphQL(projectPath);

        const schemaValidation = schema ? validationService.validateDBML(schema) : { valid: true, errors: [], warnings: [] };
        const openapiValidation = openapi ? await validationService.validateOpenAPI(openapi) : { valid: true, errors: [], warnings: [] };
        const graphqlValidation = graphql ? validationService.validateGraphQL(graphql) : { valid: true, errors: [], warnings: [] };

        // Compile results
        const results = {
          scope,
          timestamp: new Date().toISOString(),
          passed: refResult.valid && schemaValidation.valid && openapiValidation.valid && graphqlValidation.valid,
          referenceIssues: {
            brokenReferences: refResult.brokenReferences,
            orphanedArtifacts: refResult.orphanedArtifacts,
            circularDependencies: refResult.circularDependencies,
          },
          artifactValidation: {
            schema: schemaValidation,
            openapi: openapiValidation,
            graphql: graphqlValidation,
          },
        };

        // Determine analysis status
        const hasWarnings =
          schemaValidation.warnings?.length > 0 ||
          openapiValidation.warnings?.length > 0 ||
          graphqlValidation.warnings?.length > 0;
        const hasErrors = !results.passed;
        const status = hasErrors ? 'errors' : (hasWarnings ? 'warnings' : 'valid');

        // Save analysis results to database
        const analysisId = `analysis_${Date.now()}`;
        await dbService.saveAnalysisResults({
          id: analysisId,
          projectId: context.projectPath,
          scope,
          status,
          results: results as unknown as { errors?: number; warnings?: number; info?: number },
          createdAt: new Date().toISOString(),
          expiresAt: null,
        });

        return {
          action: 'runAnalyzer',
          success: true,
          message: `Analysis completed: ${results.passed ? 'PASSED' : 'FAILED'}`,
          data: results,
        };
      } catch (error) {
        return {
          action: 'runAnalyzer',
          success: false,
          error: (error as Error).message,
        };
      }
    });

    // updateProgress action
    this.registerAction('updateProgress', async (context, _options) => {
      try {
        const { getFileService } = await import('@/services/core/file.service');
        const { getSpecService } = await import('@/services/core/spec.service');

        const fileService = getFileService();
        const specService = getSpecService(fileService);

        const { artifactId, projectPath } = context;

        if (!artifactId) {
          throw new Error('Feature ID is required');
        }

        // Load feature
        const features = await specService.listFeatures(projectPath);
        const feature = features.find(f => f.id === artifactId);

        if (!feature) {
          throw new Error(`Feature not found: ${artifactId}`);
        }

        // Recalculate task progress
        const tasks = feature.tasks || [];
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;

        const taskProgress = {
          total: tasks.length,
          completed: completedTasks,
          inProgress: inProgressTasks,
          pending: pendingTasks,
          percentComplete: tasks.length > 0
            ? Math.round((completedTasks / tasks.length) * 100)
            : 0,
        };

        // Recalculate checklist progress
        const checklist = feature.checklist || [];
        const verifiedChecklist = checklist.filter(c => c.verified).length;

        const checklistProgress = {
          total: checklist.length,
          verified: verifiedChecklist,
          percentComplete: checklist.length > 0
            ? Math.round((verifiedChecklist / checklist.length) * 100)
            : 0,
        };

        // Update feature with new progress
        const moduleSlug = (context.changes?.moduleSlug as string | undefined) || 'core';
        const featureSlug = (context.changes?.featureSlug as string | undefined) || 'default';

        await specService.updateFeature(projectPath, moduleSlug, featureSlug, {
          taskProgress,
          checklistProgress,
        });

        return {
          action: 'updateProgress',
          success: true,
          message: 'Progress updated successfully',
          data: {
            taskProgress,
            checklistProgress,
          },
        };
      } catch (error) {
        return {
          action: 'updateProgress',
          success: false,
          error: (error as Error).message,
        };
      }
    });

    // notifyUser action
    this.registerAction('notifyUser', async (_context, options) => {
      // Simple notification action
      return {
        action: 'notifyUser',
        success: true,
        message: (options?.message as string | undefined) || 'Notification sent',
      };
    });
  }
}

/**
 * Create singleton instance
 */
let hookServiceInstance: HookService | null = null;

export function getHookService(): HookService {
  if (!hookServiceInstance) {
    hookServiceInstance = new HookService();
  }
  return hookServiceInstance;
}

/**
 * Reset singleton instance
 */
export function resetHookService(): void {
  hookServiceInstance = null;
}
