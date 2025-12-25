/**
 * API Generator Workflow
 * Generates OpenAPI or GraphQL specifications
 * Single bounded LLM call with format detection
 */

import type { WorkflowDefinition } from '../../../../types/workflow';

export const apiGeneratorWorkflow: WorkflowDefinition = {
  id: 're-workflow', // Note: Using RE workflow ID as placeholder for API generator
  name: 'API Specification Generation',
  description: 'Generates OpenAPI or GraphQL schema from API design requirements',
  timeout: 300000, // 5 minutes
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 5000,
  },

  steps: [
    // Load context
    {
      id: 'load_context',
      type: 'code',
      description: 'Load API design answers, schema, and existing APIs',
      handler: 'loadAPIContext',
    },

    // Determine API format
    {
      id: 'determine_format',
      type: 'conditional',
      description: 'Determine if REST, GraphQL, or both',
      condition: "data.apiStyle === 'graphql'",
      thenSteps: [
        {
          id: 'generate_graphql',
          type: 'llm',
          description: 'Generate GraphQL SDL',
          model: 'sonnet',
          systemPromptFile: 'api-graphql-system.hbs',
          userPromptFile: 'api-graphql-user.hbs',
          outputSchema: JSON.stringify({
            type: 'object',
            required: ['graphql', 'types'],
            properties: {
              graphql: {
                type: 'string',
                description: 'Valid GraphQL SDL',
              },
              types: {
                type: 'array',
                items: { type: 'string' },
              },
              queries: {
                type: 'array',
                items: { type: 'string' },
              },
              mutations: {
                type: 'array',
                items: { type: 'string' },
              },
              subscriptions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          }),
          maxTokens: 4000,
          temperature: 0.3,
        },
        {
          id: 'write_graphql',
          type: 'code',
          description: 'Write GraphQL to .foundry/apis/schema.graphql',
          handler: 'writeGraphQLFile',
        },
      ],
      elseSteps: [
        // REST API path
        {
          id: 'generate_openapi',
          type: 'llm',
          description: 'Generate OpenAPI 3.0 specification',
          model: 'sonnet',
          systemPromptFile: 'api-openapi-system.hbs',
          userPromptFile: 'api-openapi-user.hbs',
          outputSchema: JSON.stringify({
            type: 'object',
            required: ['openapi', 'paths'],
            properties: {
              openapi: {
                type: 'string',
                description: 'Valid OpenAPI 3.0 YAML',
              },
              paths: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    method: { type: 'string' },
                    summary: { type: 'string' },
                  },
                },
              },
              components: {
                type: 'object',
                properties: {
                  schemas: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          }),
          maxTokens: 4000,
          temperature: 0.3,
        },
        {
          id: 'write_openapi',
          type: 'code',
          description: 'Write OpenAPI to .foundry/apis/openapi.yaml',
          handler: 'writeOpenAPIFile',
        },

        // Check if both needed
        {
          id: 'check_both',
          type: 'conditional',
          description: 'Check if both REST and GraphQL needed',
          condition: "data.apiStyle === 'both'",
          thenSteps: [
            {
              id: 'generate_graphql_also',
              type: 'llm',
              description: 'Generate GraphQL SDL',
              model: 'sonnet',
              systemPromptFile: 'api-graphql-system.hbs',
              userPromptFile: 'api-graphql-user.hbs',
              outputSchema: JSON.stringify({
                type: 'object',
                required: ['graphql'],
                properties: {
                  graphql: { type: 'string' },
                },
              }),
              maxTokens: 4000,
              temperature: 0.3,
            },
            {
              id: 'write_graphql_also',
              type: 'code',
              description: 'Write GraphQL schema',
              handler: 'writeGraphQLFile',
            },
          ],
        },
      ],
    },

    // Validate API spec
    {
      id: 'validate_api',
      type: 'code',
      description: 'Validate generated API specification',
      handler: 'validateAPISpec',
    },

    // Update feature references
    {
      id: 'update_refs',
      type: 'code',
      description: 'Update feature apiRefs to point to generated endpoints',
      handler: 'updateAPIRefs',
    },

    // Generate summary
    {
      id: 'generate_summary',
      type: 'code',
      description: 'Generate API generation summary',
      handler: 'generateAPISummary',
    },
  ],
};
