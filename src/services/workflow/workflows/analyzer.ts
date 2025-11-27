/**
 * Analyzer Workflow
 * Validates specification consistency
 * Mostly code-based checks with minimal LLM usage
 */

import type { WorkflowDefinition } from '../../../types/workflow';

export const analyzerWorkflow: WorkflowDefinition = {
  id: 're-workflow', // Note: Using placeholder, should be 'analyzer-workflow'
  name: 'Spec Consistency Validation',
  description: 'Validates specification consistency and detects issues',
  timeout: 600000, // 10 minutes
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 5000,
  },

  steps: [
    // Load all specs
    {
      id: 'load_specs',
      type: 'code',
      description: 'Load all spec files into memory',
      handler: 'loadAllSpecs',
    },

    // Check schema references
    {
      id: 'check_schema_refs',
      type: 'code',
      description: 'Validate all schemaRefs point to existing DBML entities',
      handler: 'validateSchemaReferences',
    },

    // Check API references
    {
      id: 'check_api_refs',
      type: 'code',
      description: 'Validate all apiRefs point to existing endpoints',
      handler: 'validateAPIReferences',
    },

    // Check component references
    {
      id: 'check_component_refs',
      type: 'code',
      description: 'Validate all componentRefs point to existing components',
      handler: 'validateComponentReferences',
    },

    // Check naming conventions
    {
      id: 'check_naming',
      type: 'code',
      description: 'Validate naming conventions from constitution',
      handler: 'validateNamingConventions',
    },

    // Check circular dependencies
    {
      id: 'check_circular_deps',
      type: 'code',
      description: 'Detect circular dependencies between features',
      handler: 'detectCircularDependencies',
    },

    // Check orphan artifacts
    {
      id: 'check_orphans',
      type: 'code',
      description: 'Find artifacts not referenced by any feature',
      handler: 'findOrphanArtifacts',
    },

    // Check feature completeness
    {
      id: 'check_completeness',
      type: 'code',
      description: 'Validate features have required fields',
      handler: 'validateFeatureCompleteness',
    },

    // Check task/checklist consistency
    {
      id: 'check_tasks',
      type: 'code',
      description: 'Validate tasks and checklists are in sync',
      handler: 'validateTasksAndChecklists',
    },

    // Semantic validation (optional, uses Haiku)
    {
      id: 'semantic_validation',
      type: 'conditional',
      description: 'Run semantic validation if enabled',
      condition: 'data.enableSemanticValidation === true',
      thenSteps: [
        {
          id: 'llm_validate',
          type: 'llm',
          description: 'Semantic validation with Haiku',
          model: 'sonnet', // Using sonnet as haiku not in type
          systemPromptFile: 'analyzer-semantic-system.hbs',
          userPromptFile: 'analyzer-semantic-user.hbs',
          outputSchema: JSON.stringify({
            type: 'object',
            required: ['issues'],
            properties: {
              issues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    severity: { type: 'string', enum: ['error', 'warning', 'info'] },
                    message: { type: 'string' },
                    location: { type: 'string' },
                    suggestion: { type: 'string' },
                  },
                },
              },
            },
          }),
          maxTokens: 1000,
          temperature: 0.3,
        },
        {
          id: 'save_semantic_issues',
          type: 'code',
          description: 'Save semantic validation issues',
          handler: 'saveSemanticIssues',
        },
      ],
    },

    // Compile validation report
    {
      id: 'compile_report',
      type: 'code',
      description: 'Compile all validation results into report',
      handler: 'compileValidationReport',
    },

    // Save to database
    {
      id: 'save_results',
      type: 'code',
      description: 'Save analysis results to database',
      handler: 'saveAnalysisResults',
    },

    // Generate summary
    {
      id: 'generate_summary',
      type: 'code',
      description: 'Generate analyzer summary',
      handler: 'generateAnalyzerSummary',
    },
  ],
};
