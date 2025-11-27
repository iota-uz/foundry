/**
 * CTO Phase Workflow
 * Defines technical architecture through structured topic-based Q&A
 * Auto-invokes generators after relevant topics
 */

import type { WorkflowDefinition, TopicDefinition } from '../../../types/workflow';

// Topic definitions for CTO phase
const ctoTopics: TopicDefinition[] = [
  {
    id: 'tech-stack',
    name: 'Technology Stack',
    description: 'Languages, frameworks, infrastructure',
    order: 1,
    estimatedQuestions: 4,
    phase: 'cto',
  },
  {
    id: 'data-model',
    name: 'Data Model',
    description: 'Entities and relationships',
    order: 2,
    estimatedQuestions: 5,
    phase: 'cto',
    triggerGenerator: 'schema', // Auto-invoke schema generator
  },
  {
    id: 'api-design',
    name: 'API Design',
    description: 'REST, GraphQL, authentication',
    order: 3,
    estimatedQuestions: 4,
    phase: 'cto',
    triggerGenerator: 'api', // Auto-invoke API generator
  },
  {
    id: 'authentication',
    name: 'Authentication & Authorization',
    description: 'Security model',
    order: 4,
    estimatedQuestions: 4,
    phase: 'cto',
  },
  {
    id: 'integrations',
    name: 'External Integrations',
    description: 'Third-party dependencies',
    order: 5,
    estimatedQuestions: 3,
    phase: 'cto',
  },
  {
    id: 'performance',
    name: 'Performance & Scale',
    description: 'Expected load and requirements',
    order: 6,
    estimatedQuestions: 2,
    phase: 'cto',
  },
  {
    id: 'deployment',
    name: 'Deployment',
    description: 'Hosting, CI/CD, environments',
    order: 7,
    estimatedQuestions: 2,
    phase: 'cto',
  },
  {
    id: 'ui-components',
    name: 'UI Components',
    description: 'Key screens and interactions',
    order: 8,
    estimatedQuestions: 4,
    phase: 'cto',
    triggerGenerator: 'component', // Auto-invoke component generator
  },
];

export const ctoPhaseWorkflow: WorkflowDefinition = {
  id: 'cto-phase',
  name: 'CTO Technical Specification',
  description: 'Defines technical architecture through Q&A with auto-generated artifacts',
  topics: ctoTopics,
  timeout: 5400000, // 90 minutes
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 5000,
  },

  steps: [
    // Initialize workflow
    {
      id: 'init',
      type: 'code',
      description: 'Initialize CTO workflow state',
      handler: 'initCTOWorkflow',
    },

    // Loop through all topics
    {
      id: 'topic_loop',
      type: 'loop',
      description: 'Process each CTO topic',
      collection: 'topics',
      itemVariable: 'currentTopic',
      maxIterations: 8,
      steps: [
        // Initialize topic context
        {
          id: 'init_topic',
          type: 'code',
          description: 'Initialize topic context with CPO answers',
          handler: 'initTopicContext',
        },

        // Question loop for current topic
        {
          id: 'question_loop',
          type: 'loop',
          description: 'Ask questions for current topic',
          collection: 'currentTopic.questions',
          itemVariable: 'questionIndex',
          maxIterations: 7,
          steps: [
            // Generate question using LLM
            {
              id: 'generate_question',
              type: 'llm',
              description: 'Generate technical question for current topic',
              model: 'sonnet',
              systemPromptFile: 'cto-generate-question-system.hbs',
              userPromptFile: 'cto-generate-question-user.hbs',
              outputSchema: JSON.stringify({
                type: 'object',
                required: ['question', 'questionType'],
                properties: {
                  question: { type: 'string' },
                  questionType: {
                    type: 'string',
                    enum: ['single_choice', 'multiple_choice', 'text', 'code'],
                  },
                  options: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        label: { type: 'string' },
                        description: { type: 'string' },
                      },
                    },
                  },
                  codeLanguage: { type: 'string' },
                },
              }),
              maxTokens: 400,
              temperature: 0.7,
            },

            // Present question to user
            {
              id: 'ask_question',
              type: 'question',
              description: 'Present generated question to user',
              questionSource: 'generated',
              topicId: 'currentTopic.id',
            },

            // Save answer to spec
            {
              id: 'save_answer',
              type: 'code',
              description: 'Save user answer to spec files',
              handler: 'saveAnswerToSpec',
            },

            // Check if follow-up needed
            {
              id: 'check_followup',
              type: 'llm',
              description: 'Determine if follow-up question needed',
              model: 'sonnet',
              systemPromptFile: 'cto-check-followup-system.hbs',
              userPromptFile: 'cto-check-followup-user.hbs',
              outputSchema: JSON.stringify({
                type: 'object',
                required: ['followUpNeeded'],
                properties: {
                  followUpNeeded: { type: 'boolean' },
                  followUpQuestion: { type: 'string' },
                  reasoning: { type: 'string' },
                },
              }),
              maxTokens: 150,
              temperature: 0.5,
            },

            // Conditional: continue or break question loop
            {
              id: 'handle_followup',
              type: 'conditional',
              description: 'Determine if more questions needed for this topic',
              condition:
                "data.followUpNeeded === false || data.topicQuestionCount >= currentTopic.estimatedQuestions",
              thenSteps: [
                {
                  id: 'break_question_loop',
                  type: 'code',
                  description: 'Break out of question loop',
                  handler: 'breakQuestionLoop',
                },
              ],
            },
          ],
        },

        // Topic complete - check if generator needed
        {
          id: 'check_generator',
          type: 'conditional',
          description: 'Check if topic requires generator invocation',
          condition: 'currentTopic.triggerGenerator !== undefined',
          thenSteps: [
            // Invoke appropriate generator
            {
              id: 'invoke_generator',
              type: 'conditional',
              description: 'Invoke the appropriate generator workflow',
              condition: "currentTopic.triggerGenerator === 'schema'",
              thenSteps: [
                {
                  id: 'run_schema_generator',
                  type: 'nested_workflow',
                  description: 'Generate DBML schema',
                  workflowId: 're-workflow', // Using schema-generator workflow ID
                  input: {
                    answers: 'data.answers',
                    topic: 'currentTopic',
                  },
                },
              ],
              elseSteps: [
                {
                  id: 'check_api_generator',
                  type: 'conditional',
                  description: 'Check if API generator needed',
                  condition: "currentTopic.triggerGenerator === 'api'",
                  thenSteps: [
                    {
                      id: 'run_api_generator',
                      type: 'nested_workflow',
                      description: 'Generate API specification',
                      workflowId: 're-workflow', // Using api-generator workflow ID
                      input: {
                        answers: 'data.answers',
                        schema: 'data.schema',
                      },
                    },
                  ],
                  elseSteps: [
                    {
                      id: 'run_component_generator',
                      type: 'nested_workflow',
                      description: 'Generate UI components',
                      workflowId: 're-workflow', // Using component-generator workflow ID
                      input: {
                        answers: 'data.answers',
                        topic: 'currentTopic',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        // Topic complete
        {
          id: 'topic_complete',
          type: 'code',
          description: 'Mark topic as complete and update progress',
          handler: 'markTopicComplete',
        },
      ],
    },

    // Generate final summary
    {
      id: 'generate_summary',
      type: 'code',
      description: 'Generate CTO phase summary',
      handler: 'generateCTOSummary',
    },

    // Update project phase
    {
      id: 'update_phase',
      type: 'code',
      description: 'Update project.yaml to mark CTO phase complete',
      handler: 'updateProjectPhase',
    },
  ],
};
