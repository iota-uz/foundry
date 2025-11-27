/**
 * Main Orchestration Workflow
 * Pure code workflow controller - manages phase transitions as a state machine
 */

import type { WorkflowDefinition } from '../../../types/workflow';

export const mainOrchestrationWorkflow: WorkflowDefinition = {
  id: 'cpo-phase', // This is a special workflow ID for main orchestration
  name: 'Spec Building Orchestration',
  description: 'Coordinates all phases - pure code, no LLM',
  timeout: 7200000, // 2 hours

  steps: [
    // Start: Load project state
    {
      id: 'start',
      type: 'code',
      description: 'Load project state and determine execution path',
      handler: 'loadProjectState',
    },

    // Check mode: new or reverse engineering
    {
      id: 'check_mode',
      type: 'conditional',
      description: 'Determine if new project or reverse engineering',
      condition: "data.mode === 'reverse'",
      thenSteps: [
        {
          id: 'run_re_workflow',
          type: 'nested_workflow',
          description: 'Run reverse engineering workflow',
          workflowId: 're-workflow',
          input: {
            codebasePath: 'data.codebasePath',
          },
        },
      ],
      elseSteps: [
        // New project flow: CPO → Clarify → CTO
        {
          id: 'run_cpo_workflow',
          type: 'nested_workflow',
          description: 'Run CPO requirements gathering',
          workflowId: 'cpo-phase',
          input: {
            projectId: 'data.projectId',
            existingAnswers: 'data.cpoAnswers',
          },
        },
        {
          id: 'run_clarify_workflow',
          type: 'nested_workflow',
          description: 'Run clarify ambiguity detection',
          workflowId: 'clarify-phase',
          input: {
            cpoAnswers: 'data.cpoAnswers',
            features: 'data.features',
          },
        },
        {
          id: 'run_cto_workflow',
          type: 'nested_workflow',
          description: 'Run CTO technical specification',
          workflowId: 'cto-phase',
          input: {
            cpoAnswers: 'data.clarifiedAnswers',
            features: 'data.features',
          },
        },
      ],
    },

    // Complete: Finalize project
    {
      id: 'complete',
      type: 'code',
      description: 'Finalize project and generate summary',
      handler: 'finalizeProject',
    },
  ],
};
