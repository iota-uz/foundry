/**
 * Component Generator Workflow
 * Generates HTML/CSS UI components with Tailwind styling
 */

import type { WorkflowDefinition } from '../../../../types/workflow';

export const componentGeneratorWorkflow: WorkflowDefinition = {
  id: 're-workflow', // Note: Using RE workflow ID as placeholder for component generator
  name: 'UI Component Generation',
  description: 'Generates HTML/Tailwind components from UI requirements',
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
      description: 'Load UI requirements and existing components',
      handler: 'loadComponentContext',
    },

    // Loop through screens/components
    {
      id: 'component_loop',
      type: 'loop',
      description: 'Generate each component',
      collection: 'screens',
      itemVariable: 'currentScreen',
      steps: [
        // Generate component HTML
        {
          id: 'generate_component',
          type: 'llm',
          description: 'Generate HTML component with Tailwind CSS',
          model: 'sonnet',
          systemPromptFile: 'component-generator-system.hbs',
          userPromptFile: 'component-generator-user.hbs',
          outputSchema: JSON.stringify({
            type: 'object',
            required: ['html', 'componentId'],
            properties: {
              componentId: { type: 'string' },
              name: { type: 'string' },
              html: {
                type: 'string',
                description: 'Complete HTML with Tailwind classes',
              },
              variants: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    html: { type: 'string' },
                  },
                },
              },
              props: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    description: { type: 'string' },
                    required: { type: 'boolean' },
                  },
                },
              },
              interactions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    event: { type: 'string' },
                    action: { type: 'string' },
                  },
                },
              },
            },
          }),
          maxTokens: 2500,
          temperature: 0.4,
        },

        // Validate component HTML
        {
          id: 'validate_component',
          type: 'code',
          description: 'Validate HTML syntax and accessibility',
          handler: 'validateComponentHTML',
        },

        // Write component file
        {
          id: 'write_component',
          type: 'code',
          description: 'Write component to .foundry/components/',
          handler: 'writeComponentFile',
        },

        // Update feature references
        {
          id: 'update_component_refs',
          type: 'code',
          description: 'Update feature componentRefs',
          handler: 'updateComponentRefs',
        },
      ],
    },

    // Generate component summary
    {
      id: 'generate_summary',
      type: 'code',
      description: 'Generate component generation summary',
      handler: 'generateComponentSummary',
    },
  ],
};
