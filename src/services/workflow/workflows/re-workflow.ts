/**
 * Reverse Engineering Workflow
 * Analyzes existing codebases to generate specifications
 * Uses Opus model for complex reasoning steps
 */

import type { WorkflowDefinition } from '../../../types/workflow';

export const reverseEngineeringWorkflow: WorkflowDefinition = {
  id: 're-workflow',
  name: 'Codebase Analysis',
  description: 'Analyzes existing codebase to generate technical specifications',
  timeout: 3600000, // 1 hour
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    maxBackoffMs: 10000,
  },

  steps: [
    // Initialize RE workflow
    {
      id: 'init',
      type: 'code',
      description: 'Initialize reverse engineering workflow',
      handler: 'initREWorkflow',
    },

    // Discover directory structure
    {
      id: 'discover_structure',
      type: 'code',
      description: 'Scan directory structure and identify project type',
      handler: 'scanDirectoryStructure',
    },

    // Analyze architecture with Opus
    {
      id: 'analyze_architecture',
      type: 'llm',
      description: 'Analyze codebase structure and identify architecture patterns',
      model: 'opus',
      systemPromptFile: 're-analyze-architecture-system.hbs',
      userPromptFile: 're-analyze-architecture-user.hbs',
      outputSchema: JSON.stringify({
        type: 'object',
        required: ['modules', 'architecture'],
        properties: {
          modules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                path: { type: 'string' },
                purpose: { type: 'string' },
                files: { type: 'array', items: { type: 'string' } },
                dependencies: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          architecture: {
            type: 'string',
            enum: ['MVC', 'Clean', 'Hexagonal', 'Layered', 'Microservices', 'Monolith', 'Unknown'],
          },
          patterns: {
            type: 'array',
            items: { type: 'string' },
          },
          techStack: {
            type: 'object',
            properties: {
              language: { type: 'string' },
              framework: { type: 'string' },
              database: { type: 'string' },
              buildTool: { type: 'string' },
            },
          },
        },
      }),
      maxTokens: 3000,
      temperature: 0.3,
    },

    // Extract features from modules
    {
      id: 'extract_features_loop',
      type: 'loop',
      description: 'Extract features from each module',
      collection: 'modules',
      itemVariable: 'currentModule',
      steps: [
        // Load module files
        {
          id: 'load_module_files',
          type: 'code',
          description: 'Load source files for current module',
          handler: 'loadModuleFiles',
        },

        // Extract features with Opus
        {
          id: 'extract_features',
          type: 'llm',
          description: 'Extract features from module source code',
          model: 'opus',
          systemPromptFile: 're-extract-features-system.hbs',
          userPromptFile: 're-extract-features-user.hbs',
          outputSchema: JSON.stringify({
            type: 'object',
            required: ['features'],
            properties: {
              features: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    description: { type: 'string' },
                    files: { type: 'array', items: { type: 'string' } },
                    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                    patterns: { type: 'array', items: { type: 'string' } },
                    userStory: { type: 'string' },
                    acceptanceCriteria: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          }),
          maxTokens: 3000,
          temperature: 0.3,
        },

        // Save features to spec
        {
          id: 'save_module_features',
          type: 'code',
          description: 'Save extracted features to spec files',
          handler: 'saveModuleFeatures',
        },
      ],
    },

    // Find and parse schema files
    {
      id: 'find_schema_files',
      type: 'code',
      description: 'Find database migrations, models, ORM definitions',
      handler: 'findSchemaFiles',
    },

    // Parse schemas with Opus
    {
      id: 'parse_schemas',
      type: 'llm',
      description: 'Parse database schema definitions and convert to DBML',
      model: 'opus',
      systemPromptFile: 're-parse-schemas-system.hbs',
      userPromptFile: 're-parse-schemas-user.hbs',
      outputSchema: JSON.stringify({
        type: 'object',
        required: ['dbml', 'entities'],
        properties: {
          dbml: {
            type: 'string',
            description: 'Complete DBML schema',
          },
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                source: { type: 'string' },
                fields: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      nullable: { type: 'boolean' },
                    },
                  },
                },
                relationships: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      target: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      maxTokens: 4000,
      temperature: 0.2,
    },

    // Write DBML schema
    {
      id: 'write_schema',
      type: 'code',
      description: 'Write extracted schema to .foundry/schemas/schema.dbml',
      handler: 'writeSchemaFile',
    },

    // Find and parse API files
    {
      id: 'find_api_files',
      type: 'code',
      description: 'Find routes, controllers, handlers',
      handler: 'findAPIFiles',
    },

    // Parse APIs with Opus
    {
      id: 'parse_apis',
      type: 'llm',
      description: 'Extract API endpoints and convert to OpenAPI',
      model: 'opus',
      systemPromptFile: 're-parse-apis-system.hbs',
      userPromptFile: 're-parse-apis-user.hbs',
      outputSchema: JSON.stringify({
        type: 'object',
        required: ['openapi', 'endpoints'],
        properties: {
          openapi: {
            type: 'string',
            description: 'OpenAPI 3.0 YAML specification',
          },
          endpoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                method: { type: 'string' },
                path: { type: 'string' },
                handler: { type: 'string' },
                parameters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      in: { type: 'string' },
                      type: { type: 'string' },
                    },
                  },
                },
                authentication: { type: 'boolean' },
                featureRef: { type: 'string' },
              },
            },
          },
        },
      }),
      maxTokens: 4000,
      temperature: 0.2,
    },

    // Write API spec
    {
      id: 'write_api',
      type: 'code',
      description: 'Write extracted API to .foundry/apis/openapi.yaml',
      handler: 'writeOpenAPIFile',
    },

    // Compile final report
    {
      id: 'compile_report',
      type: 'code',
      description: 'Compile all reverse engineering results into report',
      handler: 'compileREReport',
    },

    // Update project metadata
    {
      id: 'update_project',
      type: 'code',
      description: 'Update project.yaml with RE results',
      handler: 'updateProjectWithREResults',
    },
  ],
};
