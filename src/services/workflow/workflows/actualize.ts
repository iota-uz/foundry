/**
 * Actualize Workflow
 * Synchronizes specifications with codebase implementation
 * Detects drift and offers resolution options
 */

import type { WorkflowDefinition } from '../../../types/workflow';

export const actualizeWorkflow: WorkflowDefinition = {
  id: 'actualize-workflow',
  name: 'Spec-Code Synchronization',
  description: 'Detects and resolves drift between specifications and implementation',
  timeout: 3600000, // 1 hour
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    maxBackoffMs: 10000,
  },

  steps: [
    // Initialize workflow
    {
      id: 'init',
      type: 'code',
      description: 'Initialize actualize workflow',
      handler: 'initActualizeWorkflow',
    },

    // Load current spec
    {
      id: 'load_spec',
      type: 'code',
      description: 'Load all current spec files',
      handler: 'loadCurrentSpec',
    },

    // Run RE analysis on codebase
    {
      id: 'run_re_analysis',
      type: 'nested_workflow',
      description: 'Analyze current codebase state',
      workflowId: 're-workflow',
      input: {
        codebasePath: 'data.codebasePath',
        mode: 'analysis', // Don't write files, just analyze
      },
    },

    // Compute structural diffs
    {
      id: 'compute_diffs',
      type: 'code',
      description: 'Compute structural differences between spec and code',
      handler: 'computeStructuralDiffs',
    },

    // Semantic comparison with Opus
    {
      id: 'semantic_comparison',
      type: 'llm',
      description: 'Semantic comparison to detect true drift vs naming differences',
      model: 'opus',
      systemPromptFile: 'actualize-compare-system.hbs',
      userPromptFile: 'actualize-compare-user.hbs',
      outputSchema: JSON.stringify({
        type: 'object',
        required: ['drift', 'summary'],
        properties: {
          drift: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['spec_outdated', 'code_missing', 'new_in_code', 'conflict'],
                },
                severity: {
                  type: 'string',
                  enum: ['critical', 'major', 'minor'],
                },
                category: {
                  type: 'string',
                  enum: ['feature', 'schema', 'api', 'component'],
                },
                specItem: { type: 'string' },
                codeItem: { type: 'string' },
                details: { type: 'string' },
                recommendation: {
                  type: 'string',
                  enum: ['update_spec', 'keep_spec', 'add_to_spec', 'flag_conflict', 'remove_from_spec'],
                },
                reasoning: { type: 'string' },
                autoFixable: { type: 'boolean' },
              },
            },
          },
          summary: {
            type: 'object',
            properties: {
              totalDrift: { type: 'number' },
              criticalCount: { type: 'number' },
              majorCount: { type: 'number' },
              minorCount: { type: 'number' },
              autoFixableCount: { type: 'number' },
            },
          },
        },
      }),
      maxTokens: 3000,
      temperature: 0.3,
    },

    // Generate drift report
    {
      id: 'generate_report',
      type: 'code',
      description: 'Generate comprehensive drift report',
      handler: 'compileDriftReport',
    },

    // Check if drift exists
    {
      id: 'check_drift',
      type: 'conditional',
      description: 'Check if any drift detected',
      condition: 'data.drift.length === 0',
      thenSteps: [
        {
          id: 'no_drift',
          type: 'code',
          description: 'No drift detected - specs are in sync',
          handler: 'markInSync',
        },
      ],
      elseSteps: [
        // Prompt user for action
        {
          id: 'prompt_action',
          type: 'question',
          description: 'Ask user how to handle detected drift',
          questionSource: 'static',
          questionData: {
            id: 'drift_action',
            question: 'Found {{drift.length}} differences between spec and code. How would you like to proceed?',
            questionType: 'single_choice',
            required: true,
            options: [
              {
                id: 'apply_all',
                label: 'Apply all non-conflicting changes',
                description: 'Automatically update spec where safe',
              },
              {
                id: 'review_each',
                label: 'Review each change',
                description: 'Step through each difference',
              },
              {
                id: 'skip',
                label: 'Skip - generate report only',
                description: 'No changes, just show diff report',
              },
            ],
          },
        },

        // Handle user choice
        {
          id: 'handle_action',
          type: 'conditional',
          description: 'Execute based on user choice',
          condition: "data.userAnswer === 'apply_all'",
          thenSteps: [
            {
              id: 'apply_all',
              type: 'code',
              description: 'Apply all auto-fixable changes',
              handler: 'applyNonConflictingChanges',
            },
          ],
          elseSteps: [
            {
              id: 'check_review',
              type: 'conditional',
              description: 'Check if reviewing each',
              condition: "data.userAnswer === 'review_each'",
              thenSteps: [
                // Review loop
                {
                  id: 'review_loop',
                  type: 'loop',
                  description: 'Review each drift item',
                  collection: 'drift',
                  itemVariable: 'currentDrift',
                  steps: [
                    {
                      id: 'review_single',
                      type: 'question',
                      description: 'Review single drift item',
                      questionSource: 'static',
                      questionData: {
                        id: 'drift_review',
                        question:
                          '{{currentDrift.type}}: {{currentDrift.details}}\n\nSpec: {{currentDrift.specItem}}\nCode: {{currentDrift.codeItem}}\n\nRecommendation: {{currentDrift.recommendation}}',
                        questionType: 'single_choice',
                        required: true,
                        options: [
                          {
                            id: 'apply',
                            label: 'Apply recommendation',
                          },
                          {
                            id: 'skip',
                            label: 'Skip this change',
                          },
                          {
                            id: 'custom',
                            label: 'Custom action',
                          },
                        ],
                      },
                    },
                    {
                      id: 'handle_drift_action',
                      type: 'conditional',
                      description: 'Apply or skip drift',
                      condition: "data.userAnswer === 'apply'",
                      thenSteps: [
                        {
                          id: 'apply_single',
                          type: 'code',
                          description: 'Apply single drift change',
                          handler: 'applySingleDrift',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // Generate final summary
    {
      id: 'generate_summary',
      type: 'code',
      description: 'Generate actualize workflow summary',
      handler: 'generateActualizeSummary',
    },
  ],
};
