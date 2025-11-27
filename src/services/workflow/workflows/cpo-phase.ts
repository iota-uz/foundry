/**
 * CPO Phase Workflow
 * Gathers product requirements through structured topic-based Q&A
 * Questions are AI-generated within topic constraints
 */

import type { WorkflowDefinition, TopicDefinition } from '../../../types/workflow';

// Topic definitions for CPO phase
const cpoTopics: TopicDefinition[] = [
  {
    id: 'problem-statement',
    name: 'Problem Statement',
    description: 'Core problem being solved',
    order: 1,
    estimatedQuestions: 3,
    phase: 'cpo',
  },
  {
    id: 'target-users',
    name: 'Target Users',
    description: 'Who will use this product',
    order: 2,
    estimatedQuestions: 3,
    phase: 'cpo',
  },
  {
    id: 'core-features',
    name: 'Core Features',
    description: 'Main functionality for MVP',
    order: 3,
    estimatedQuestions: 5,
    phase: 'cpo',
  },
  {
    id: 'user-flows',
    name: 'User Flows',
    description: 'How users accomplish tasks',
    order: 4,
    estimatedQuestions: 3,
    phase: 'cpo',
  },
  {
    id: 'priorities',
    name: 'Priority Ranking',
    description: 'Feature prioritization',
    order: 5,
    estimatedQuestions: 3,
    phase: 'cpo',
  },
  {
    id: 'success-metrics',
    name: 'Success Metrics',
    description: 'How success is measured',
    order: 6,
    estimatedQuestions: 2,
    phase: 'cpo',
  },
  {
    id: 'competitive-landscape',
    name: 'Competitive Landscape',
    description: 'Market positioning',
    order: 7,
    estimatedQuestions: 2,
    phase: 'cpo',
  },
  {
    id: 'constraints',
    name: 'Constraints & Non-Goals',
    description: 'Explicit scope boundaries',
    order: 8,
    estimatedQuestions: 2,
    phase: 'cpo',
  },
];

export const cpoPhaseWorkflow: WorkflowDefinition = {
  id: 'cpo-phase',
  name: 'CPO Requirements Gathering',
  description: 'Gathers product requirements through structured Q&A with 8 topics',
  topics: cpoTopics,
  timeout: 3600000, // 1 hour
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
      description: 'Initialize CPO workflow state',
      handler: 'initCPOWorkflow',
    },

    // Loop through all topics
    {
      id: 'topic_loop',
      type: 'loop',
      description: 'Process each CPO topic',
      collection: 'topics',
      itemVariable: 'currentTopic',
      maxIterations: 8,
      steps: [
        // Initialize topic context
        {
          id: 'init_topic',
          type: 'code',
          description: 'Initialize topic context and load previous answers',
          handler: 'initTopicContext',
        },

        // Question loop for current topic
        {
          id: 'question_loop',
          type: 'loop',
          description: 'Ask questions for current topic',
          collection: 'currentTopic.questions',
          itemVariable: 'questionIndex',
          maxIterations: 7, // Max 7 questions per topic (Miller's Law)
          steps: [
            // Generate question using LLM
            {
              id: 'generate_question',
              type: 'llm',
              description: 'Generate conversational question for current topic',
              model: 'sonnet',
              systemPromptFile: 'cpo-generate-question-system.hbs',
              userPromptFile: 'cpo-generate-question-user.hbs',
              outputSchema: JSON.stringify({
                type: 'object',
                required: ['question', 'questionType'],
                properties: {
                  question: { type: 'string' },
                  questionType: {
                    type: 'string',
                    enum: ['single_choice', 'multiple_choice', 'text'],
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
                },
              }),
              maxTokens: 300,
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
              systemPromptFile: 'cpo-check-followup-system.hbs',
              userPromptFile: 'cpo-check-followup-user.hbs',
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

        // Topic complete
        {
          id: 'topic_complete',
          type: 'code',
          description: 'Mark topic as complete and update progress',
          handler: 'markTopicComplete',
        },
      ],
    },

    // Check overall completeness
    {
      id: 'check_completeness',
      type: 'llm',
      description: 'Review all answers and identify critical gaps',
      model: 'sonnet',
      systemPromptFile: 'cpo-check-completeness-system.hbs',
      userPromptFile: 'cpo-check-completeness-user.hbs',
      outputSchema: JSON.stringify({
        type: 'object',
        required: ['complete', 'gaps'],
        properties: {
          complete: { type: 'boolean' },
          gaps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string' },
                issue: { type: 'string' },
                question: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
      }),
      maxTokens: 500,
      temperature: 0.5,
    },

    // Handle gaps if any
    {
      id: 'handle_gaps',
      type: 'conditional',
      description: 'Address critical gaps if found',
      condition: 'data.gaps.length > 0',
      thenSteps: [
        {
          id: 'address_gaps_loop',
          type: 'loop',
          description: 'Ask follow-up questions for gaps',
          collection: 'gaps',
          itemVariable: 'currentGap',
          maxIterations: 5, // Max 5 gap questions
          steps: [
            {
              id: 'ask_gap_question',
              type: 'question',
              description: 'Ask clarifying question for gap',
              questionSource: 'generated',
              generatorPromptFile: 'cpo-gap-question.hbs',
            },
            {
              id: 'save_gap_answer',
              type: 'code',
              description: 'Save gap answer to spec',
              handler: 'saveAnswerToSpec',
            },
          ],
        },
      ],
    },

    // Generate summary
    {
      id: 'generate_summary',
      type: 'code',
      description: 'Generate CPO phase summary',
      handler: 'generateCPOSummary',
    },

    // Update project phase
    {
      id: 'update_phase',
      type: 'code',
      description: 'Update project.yaml to mark CPO phase complete',
      handler: 'updateProjectPhase',
    },
  ],
};
