/**
 * Issue Planning Workflow
 *
 * AI-powered planning system that asks intelligent questions across 3 phases
 * and generates comprehensive planning artifacts (diagrams, tasks, specs).
 *
 * Flow:
 * Requirements Phase → Clarify Phase → Technical Phase → Generate Artifacts
 *
 * Each phase:
 * 1. Generate question batch (AgentNode)
 * 2. Wait for user answers (pause execution)
 * 3. Process answers and decide: more questions or next phase
 *
 * @example
 * ```typescript
 * const engine = new GraphEngine();
 * const result = await engine.run('issue-planning', {
 *   context: {
 *     issueId: 'uuid',
 *     issueTitle: 'Add dark mode',
 *     issueBody: 'Users want dark mode...',
 *     preferences: { taskGranularity: 'medium' }
 *   }
 * });
 * ```
 */

import {
  defineNodes,
  defineWorkflow,
  StdlibTool,
  AgentModel,
  SpecialNode,
} from '../index';
import type {
  PlanningPhase,
  QuestionBatch,
  Answer,
  PlanArtifacts,
} from '@/lib/planning/types';

// ============================================================================
// Context Type Definitions
// ============================================================================

/**
 * User preferences for planning
 */
export interface PlanningPreferences {
  diagramTypes?: Array<'architecture' | 'data_flow' | 'sequence' | 'entity_relationship'>;
  taskGranularity?: 'coarse' | 'medium' | 'fine';
}

/**
 * Issue planning workflow context
 */
export interface IssuePlanningContext extends Record<string, unknown> {
  // ─────────────────────────────────────────────────────────────────────────
  // Input (provided at workflow start)
  // ─────────────────────────────────────────────────────────────────────────

  /** Issue metadata ID from database */
  issueId: string;

  /** Issue title */
  issueTitle: string;

  /** Issue body/description */
  issueBody: string;

  /** User preferences for planning */
  preferences: PlanningPreferences;

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow state
  // ─────────────────────────────────────────────────────────────────────────

  /** Current planning phase */
  currentPhase: PlanningPhase;

  /** All question batches generated so far */
  questionBatches: QuestionBatch[];

  /** Index of current batch being answered */
  currentBatchIndex: number;

  /** All answers collected (keyed by questionId) */
  answers: Record<string, Answer>;

  /** Whether workflow is waiting for user input */
  waitingForInput: boolean;

  /** Whether current phase is complete */
  phaseComplete: boolean;

  /** Whether all phases are complete */
  allPhasesComplete: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Generated artifacts
  // ─────────────────────────────────────────────────────────────────────────

  /** Generated planning artifacts */
  artifacts: PlanArtifacts;

  // ─────────────────────────────────────────────────────────────────────────
  // Temporary state
  // ─────────────────────────────────────────────────────────────────────────

  /** Codebase exploration output */
  explorationOutput?: string;

  /** Latest LLM generation result */
  latestGeneration?: string;

  /** Error message if workflow failed */
  error?: string;
}

// ============================================================================
// Schema Definition
// ============================================================================

const schema = defineNodes<IssuePlanningContext>()([
  // Phase nodes
  'START_REQUIREMENTS',
  'GENERATE_REQ_QUESTIONS',
  'WAIT_REQ_ANSWERS',
  'PROCESS_REQ_ANSWERS',

  'START_CLARIFY',
  'GENERATE_CLARIFY_QUESTIONS',
  'WAIT_CLARIFY_ANSWERS',
  'PROCESS_CLARIFY_ANSWERS',

  'START_TECHNICAL',
  'GENERATE_TECH_QUESTIONS',
  'WAIT_TECH_ANSWERS',
  'PROCESS_TECH_ANSWERS',

  // Artifact generation
  'GENERATE_DIAGRAMS',
  'GENERATE_TASKS',
  'GENERATE_UI_MOCKUPS',
  'GENERATE_API_SPECS',
  'FINALIZE',
] as const);

// ============================================================================
// Workflow Definition
// ============================================================================

/**
 * Issue planning workflow
 */
export const issuePlanningWorkflow = defineWorkflow({
  id: 'issue-planning',
  schema,
  initialContext: {
    issueId: '',
    issueTitle: '',
    issueBody: '',
    preferences: {},
    currentPhase: 'requirements' as PlanningPhase,
    questionBatches: [],
    currentBatchIndex: 0,
    answers: {},
    waitingForInput: false,
    phaseComplete: false,
    allPhasesComplete: false,
    artifacts: {
      diagrams: [],
      tasks: [],
      uiMockups: [],
      apiSpecs: [],
    },
  },
  nodes: [
    // =========================================================================
    // REQUIREMENTS PHASE
    // =========================================================================

    schema.eval('START_REQUIREMENTS', {
      update: () => ({
        currentPhase: 'requirements' as PlanningPhase,
        phaseComplete: false,
      }),
      then: () => 'GENERATE_REQ_QUESTIONS',
    }),

    schema.agent('GENERATE_REQ_QUESTIONS', {
      role: 'requirements-analyst',
      prompt: `You are a requirements analyst helping plan an issue.

## Issue Information
- Title: {{context.issueTitle}}
- Description: {{context.issueBody}}

## Your Task
Generate 3-5 high-level questions to understand the requirements. Focus on:
1. What problem are we solving?
2. Who is the target user?
3. What are the success criteria?
4. What are the constraints?

Output a JSON array of questions following this schema:
\`\`\`typescript
interface Question {
  id: string;           // e.g., "req-1"
  question: string;     // The actual question
  questionType: "single_choice" | "multiple_choice" | "text" | "number" | "code";
  description?: string; // Optional context
  whyAsking?: string;   // Why this question matters
  options?: Array<{     // For choice questions
    id: string;
    label: string;
    description?: string;
    isRecommended?: boolean;
    recommendationReason?: string;
  }>;
  required: boolean;
  defaultValue?: unknown;
}
\`\`\`

Update context.questionBatches with a new batch containing these questions.`,
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      model: AgentModel.Sonnet,
      then: () => 'WAIT_REQ_ANSWERS',
    }),

    schema.eval('WAIT_REQ_ANSWERS', {
      update: () => ({
        waitingForInput: true,
      }),
      then: () => 'PROCESS_REQ_ANSWERS',
    }),

    schema.eval('PROCESS_REQ_ANSWERS', {
      update: (state) => {
        // Check if we have answers for current batch
        const currentBatch = state.context.questionBatches[state.context.currentBatchIndex];
        if (!currentBatch) {
          return { phaseComplete: true, waitingForInput: false };
        }

        const allAnswered = currentBatch.questions.every(
          (q) => state.context.answers[q.id] !== undefined
        );

        // Determine if we need more questions or phase is complete
        // For now, assume one batch per phase is enough
        return {
          phaseComplete: allAnswered,
          waitingForInput: false,
        };
      },
      then: (state) => {
        if (state.context.phaseComplete) {
          return 'START_CLARIFY';
        }
        return 'GENERATE_REQ_QUESTIONS';
      },
    }),

    // =========================================================================
    // CLARIFY PHASE
    // =========================================================================

    schema.eval('START_CLARIFY', {
      update: () => ({
        currentPhase: 'clarify' as PlanningPhase,
        phaseComplete: false,
      }),
      then: () => 'GENERATE_CLARIFY_QUESTIONS',
    }),

    schema.agent('GENERATE_CLARIFY_QUESTIONS', {
      role: 'clarification-specialist',
      prompt: `You are clarifying ambiguities based on requirements answers.

## Previous Answers
{{#each context.answers}}
- {{@key}}: {{this.value}}
{{/each}}

## Your Task
Based on the requirements answers, generate 3-5 clarifying questions to resolve:
1. Edge cases and error scenarios
2. UI/UX specifics
3. Performance expectations
4. Integration points

Use the same JSON question schema as before.
Update context.questionBatches with a new batch.`,
      capabilities: [StdlibTool.Read, StdlibTool.Glob, StdlibTool.Grep],
      model: AgentModel.Sonnet,
      then: () => 'WAIT_CLARIFY_ANSWERS',
    }),

    schema.eval('WAIT_CLARIFY_ANSWERS', {
      update: () => ({
        waitingForInput: true,
      }),
      then: () => 'PROCESS_CLARIFY_ANSWERS',
    }),

    schema.eval('PROCESS_CLARIFY_ANSWERS', {
      update: (state) => {
        const currentBatch = state.context.questionBatches[state.context.currentBatchIndex];
        if (!currentBatch) {
          return { phaseComplete: true, waitingForInput: false };
        }

        const allAnswered = currentBatch.questions.every(
          (q) => state.context.answers[q.id] !== undefined
        );

        return {
          phaseComplete: allAnswered,
          waitingForInput: false,
        };
      },
      then: (state) => {
        if (state.context.phaseComplete) {
          return 'START_TECHNICAL';
        }
        return 'GENERATE_CLARIFY_QUESTIONS';
      },
    }),

    // =========================================================================
    // TECHNICAL PHASE
    // =========================================================================

    schema.eval('START_TECHNICAL', {
      update: () => ({
        currentPhase: 'technical' as PlanningPhase,
        phaseComplete: false,
      }),
      then: () => 'GENERATE_TECH_QUESTIONS',
    }),

    schema.agent('GENERATE_TECH_QUESTIONS', {
      role: 'technical-architect',
      prompt: `You are diving into technical details.

## All Answers So Far
{{#each context.answers}}
- {{@key}}: {{this.value}}
{{/each}}

## Your Task
Generate 3-5 technical questions about:
1. Technology stack and libraries
2. Database schema changes
3. API design decisions
4. Security considerations
5. Testing strategy

Use the same JSON question schema.
Update context.questionBatches with a new batch.`,
      capabilities: [StdlibTool.Read, StdlibTool.Glob, StdlibTool.Grep],
      model: AgentModel.Sonnet,
      then: () => 'WAIT_TECH_ANSWERS',
    }),

    schema.eval('WAIT_TECH_ANSWERS', {
      update: () => ({
        waitingForInput: true,
      }),
      then: () => 'PROCESS_TECH_ANSWERS',
    }),

    schema.eval('PROCESS_TECH_ANSWERS', {
      update: (state) => {
        const currentBatch = state.context.questionBatches[state.context.currentBatchIndex];
        if (!currentBatch) {
          return { phaseComplete: true, allPhasesComplete: true, waitingForInput: false };
        }

        const allAnswered = currentBatch.questions.every(
          (q) => state.context.answers[q.id] !== undefined
        );

        return {
          phaseComplete: allAnswered,
          allPhasesComplete: allAnswered,
          waitingForInput: false,
        };
      },
      then: (state) => {
        if (state.context.allPhasesComplete) {
          return 'GENERATE_DIAGRAMS';
        }
        return 'GENERATE_TECH_QUESTIONS';
      },
    }),

    // =========================================================================
    // ARTIFACT GENERATION
    // =========================================================================

    schema.agent('GENERATE_DIAGRAMS', {
      role: 'architect',
      prompt: `Generate Mermaid diagrams based on all answers.

## All Answers
{{#each context.answers}}
- {{@key}}: {{this.value}}
{{/each}}

## Diagram Types
{{#if context.preferences.diagramTypes}}
Focus on: {{context.preferences.diagramTypes}}
{{else}}
Generate: architecture, data_flow, and sequence diagrams
{{/if}}

## Your Task
Create 2-4 Mermaid diagrams and update context.artifacts.diagrams with:
\`\`\`typescript
interface MermaidDiagram {
  id: string;
  type: 'architecture' | 'data_flow' | 'sequence' | 'entity_relationship';
  title: string;
  mermaidCode: string;
  description: string;
  createdAt: string;
}
\`\`\``,
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      model: AgentModel.Sonnet,
      then: () => 'GENERATE_TASKS',
    }),

    schema.agent('GENERATE_TASKS', {
      role: 'project-manager',
      prompt: `Break down the issue into implementation tasks.

## All Answers
{{#each context.answers}}
- {{@key}}: {{this.value}}
{{/each}}

## Task Granularity
{{#if context.preferences.taskGranularity}}
{{context.preferences.taskGranularity}}
{{else}}
medium
{{/if}}

## Your Task
Create 5-15 implementation tasks and update context.artifacts.tasks with:
\`\`\`typescript
interface ImplementationTask {
  id: string;
  title: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  dependsOn: string[];
  tags: string[];
  acceptanceCriteria: string[];
  order: number;
}
\`\`\`

Order tasks logically with dependencies.`,
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      model: AgentModel.Sonnet,
      then: () => 'GENERATE_UI_MOCKUPS',
    }),

    schema.agent('GENERATE_UI_MOCKUPS', {
      role: 'ui-designer',
      prompt: `Generate UI component specifications (if UI work is needed).

## All Answers
{{#each context.answers}}
- {{@key}}: {{this.value}}
{{/each}}

## Your Task
If this issue involves UI:
- Create component specs with HTML previews
- Update context.artifacts.uiMockups

If no UI work needed, set uiMockups to empty array.

\`\`\`typescript
interface ComponentSpec {
  id: string;
  name: string;
  type: 'page' | 'component';
  description: string;
  htmlPreview?: string;
  props?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}
\`\`\``,
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      model: AgentModel.Sonnet,
      then: () => 'GENERATE_API_SPECS',
    }),

    schema.agent('GENERATE_API_SPECS', {
      role: 'api-designer',
      prompt: `Generate API specifications (if API work is needed).

## All Answers
{{#each context.answers}}
- {{@key}}: {{this.value}}
{{/each}}

## Your Task
If this issue involves API changes:
- Create API endpoint specs
- Update context.artifacts.apiSpecs

If no API work needed, set apiSpecs to empty array.

\`\`\`typescript
interface APISpec {
  id: string;
  type: 'rest' | 'graphql';
  method?: string;
  path?: string;
  operation?: string;
  description: string;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
}
\`\`\``,
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      model: AgentModel.Sonnet,
      then: () => 'FINALIZE',
    }),

    schema.eval('FINALIZE', {
      update: () => ({
        allPhasesComplete: true,
      }),
      then: () => SpecialNode.End,
    }),
  ],
});

// Default export for config loading
export default issuePlanningWorkflow;
