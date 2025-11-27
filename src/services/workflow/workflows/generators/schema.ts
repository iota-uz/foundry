/**
 * Schema Generator Workflow
 * Generates DBML database schemas from data model answers
 * Single bounded LLM call with structured output
 */

import type { WorkflowDefinition } from '../../../../types/workflow';

export const schemaGeneratorWorkflow: WorkflowDefinition = {
  id: 're-workflow', // Note: Using RE workflow ID as placeholder for schema generator
  name: 'DBML Schema Generation',
  description: 'Generates database schema in DBML format from data model requirements',
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
      description: 'Load data model answers and existing schemas',
      handler: 'loadSchemaContext',
    },

    // Generate DBML using LLM
    {
      id: 'generate_dbml',
      type: 'llm',
      description: 'Generate DBML schema from requirements',
      model: 'sonnet',
      systemPromptFile: 'schema-generator-system.hbs',
      userPromptFile: 'schema-generator-user.hbs',
      outputSchema: JSON.stringify({
        type: 'object',
        required: ['dbml', 'tables'],
        properties: {
          dbml: {
            type: 'string',
            description: 'Valid DBML schema syntax',
          },
          tables: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of table names',
          },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                type: { type: 'string', enum: ['one-to-one', 'one-to-many', 'many-to-many'] },
              },
            },
          },
          indexes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                table: { type: 'string' },
                columns: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      }),
      maxTokens: 3000,
      temperature: 0.3,
    },

    // Validate DBML
    {
      id: 'validate_dbml',
      type: 'code',
      description: 'Validate generated DBML syntax',
      handler: 'validateDBML',
    },

    // Write schema file
    {
      id: 'write_schema',
      type: 'code',
      description: 'Write DBML to .foundry/schemas/schema.dbml',
      handler: 'writeSchemaFile',
    },

    // Update feature references
    {
      id: 'update_refs',
      type: 'code',
      description: 'Update feature schemaRefs to point to generated entities',
      handler: 'updateSchemaRefs',
    },

    // Generate summary
    {
      id: 'generate_summary',
      type: 'code',
      description: 'Generate schema generation summary',
      handler: 'generateSchemaSummary',
    },
  ],
};
