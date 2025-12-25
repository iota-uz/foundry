/**
 * Workflow step types
 */

import type { AIQuestion, QuestionType, QuestionOption, ValidationRule, ClaudeModel } from '../ai';

/**
 * Base step definition
 */
export interface BaseStepDefinition {
  id: string;
  type: StepType;
  description: string;
  timeout?: number; // Step timeout in ms
  retryable?: boolean;
}

/**
 * Step type discriminator
 */
export type StepType =
  | 'code'
  | 'llm'
  | 'question'
  | 'conditional'
  | 'loop'
  | 'nested_workflow';

/**
 * Code step - executes pure function
 */
export interface CodeStep extends BaseStepDefinition {
  type: 'code';
  handler: string; // Function name to execute
  input?: Record<string, unknown>;
}

/**
 * LLM step - single bounded Claude API call
 */
export interface LLMStep extends BaseStepDefinition {
  type: 'llm';
  model: ClaudeModel;
  systemPromptFile: string; // Path to Handlebars template
  userPromptFile: string; // Path to Handlebars template
  outputSchema?: string; // JSON schema for structured output
  maxTokens?: number;
  temperature?: number;
}

/**
 * Question step - presents question to user
 */
export interface QuestionStep extends BaseStepDefinition {
  type: 'question';
  questionSource: 'static' | 'generated'; // Static or AI-generated
  questionData?: AIQuestion; // For static questions
  generatorPromptFile?: string; // For generated questions
  topicId?: string; // Topic context for generated questions
}

// Re-export AI types for convenience
export type { AIQuestion, QuestionType, QuestionOption, ValidationRule, ClaudeModel };

/**
 * Conditional step - branch based on condition
 */
export interface ConditionalStep extends BaseStepDefinition {
  type: 'conditional';
  condition: string; // Expression to evaluate
  thenSteps: StepDefinition[];
  elseSteps?: StepDefinition[];
}

/**
 * Loop step - iterate over collection
 */
export interface LoopStep extends BaseStepDefinition {
  type: 'loop';
  collection: string; // Path to collection in workflow data
  itemVariable: string; // Variable name for loop item
  steps: StepDefinition[];
  maxIterations?: number;
}

/**
 * Nested workflow step - execute another workflow
 */
export interface NestedWorkflowStep extends BaseStepDefinition {
  type: 'nested_workflow';
  workflowId: string;
  input?: Record<string, unknown>;
}

/**
 * Union of all step types
 */
export type StepDefinition =
  | CodeStep
  | LLMStep
  | QuestionStep
  | ConditionalStep
  | LoopStep
  | NestedWorkflowStep;

/**
 * Step execution result
 */
export interface StepResult {
  stepId: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: Record<string, unknown>;
  error?: string;
  duration: number;
  tokensUsed?: number; // For LLM steps
}

/**
 * Step execution record for history
 */
export interface StepExecution {
  id: string;
  checkpointId: string;
  stepId: string;
  stepType: StepType;
  status: 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string | undefined;
  inputData?: Record<string, unknown> | undefined;
  outputData?: Record<string, unknown> | undefined;
  error?: string | undefined;
  llmTokensUsed?: number | undefined;
  durationMs: number;
}
