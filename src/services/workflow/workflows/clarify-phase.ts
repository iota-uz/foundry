/**
 * Clarify Phase Workflow
 * Detects and resolves ambiguities in specifications
 * Combines rule-based scanning with LLM categorization
 */

import type { WorkflowDefinition } from '../../../types/workflow';

export const clarifyPhaseWorkflow: WorkflowDefinition = {
  id: 'clarify-phase',
  name: 'Ambiguity Detection and Resolution',
  description: 'Automatically detects vague language and missing details, prompts for clarification',
  timeout: 1800000, // 30 minutes
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 5000,
  },

  steps: [
    // Initialize clarify workflow
    {
      id: 'init',
      type: 'code',
      description: 'Initialize clarify workflow and load CPO answers',
      handler: 'initClarifyWorkflow',
    },

    // Rule-based ambiguity detection
    {
      id: 'scan_ambiguities',
      type: 'code',
      description: 'Scan spec for ambiguities using regex and rule-based detection',
      handler: 'detectAmbiguities',
    },

    // LLM categorization and question generation
    {
      id: 'categorize_ambiguities',
      type: 'llm',
      description: 'Categorize ambiguities and generate clarifying questions',
      model: 'sonnet',
      systemPromptFile: 'clarify-categorize-system.hbs',
      userPromptFile: 'clarify-categorize-user.hbs',
      outputSchema: JSON.stringify({
        type: 'object',
        required: ['ambiguities'],
        properties: {
          ambiguities: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'type', 'severity', 'question'],
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['vague_language', 'missing_edge_case', 'ambiguous_flow', 'conflict'],
                },
                severity: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                },
                text: { type: 'string' },
                context: { type: 'string' },
                question: { type: 'string' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
          summary: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              highSeverity: { type: 'number' },
              mediumSeverity: { type: 'number' },
              lowSeverity: { type: 'number' },
            },
          },
        },
      }),
      maxTokens: 2000,
      temperature: 0.5,
    },

    // Check if ambiguities found
    {
      id: 'check_ambiguities',
      type: 'conditional',
      description: 'Check if any ambiguities were detected',
      condition: 'data.ambiguities.length === 0',
      thenSteps: [
        {
          id: 'no_ambiguities',
          type: 'code',
          description: 'No ambiguities found - workflow complete',
          handler: 'markClarifyComplete',
        },
      ],
      elseSteps: [
        // Present ambiguity summary to user
        {
          id: 'present_summary',
          type: 'code',
          description: 'Display ambiguity summary to user',
          handler: 'presentAmbiguitySummary',
        },

        // Loop through ambiguities
        {
          id: 'resolve_loop',
          type: 'loop',
          description: 'Resolve each ambiguity',
          collection: 'ambiguities',
          itemVariable: 'currentAmbiguity',
          steps: [
            // Present clarification question
            {
              id: 'ask_clarification',
              type: 'question',
              description: 'Ask user to clarify ambiguous point',
              questionSource: 'static',
              questionData: {
                question: 'currentAmbiguity.question',
                questionType: 'single_choice',
                options: 'currentAmbiguity.options',
                context: 'currentAmbiguity.context',
                allowSkip: true,
              } as any,
            },

            // Handle resolution
            {
              id: 'handle_resolution',
              type: 'conditional',
              description: 'Apply resolution or defer',
              condition: "data.userAnswer === 'SKIP'",
              thenSteps: [
                {
                  id: 'defer_ambiguity',
                  type: 'code',
                  description: 'Mark ambiguity as deferred for CTO phase',
                  handler: 'deferAmbiguity',
                },
              ],
              elseSteps: [
                {
                  id: 'apply_resolution',
                  type: 'code',
                  description: 'Apply user clarification to spec',
                  handler: 'applyResolution',
                },
              ],
            },
          ],
        },

        // Generate clarify summary
        {
          id: 'generate_summary',
          type: 'code',
          description: 'Generate clarify phase summary',
          handler: 'generateClarifySummary',
        },
      ],
    },

    // Update project phase
    {
      id: 'update_phase',
      type: 'code',
      description: 'Update project.yaml to mark clarify phase complete',
      handler: 'updateProjectPhase',
    },
  ],
};
