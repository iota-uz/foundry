/**
 * Prompt types for template management
 */

/**
 * Prompt template context
 */
export interface PromptContext {
  // Current topic/feature being explored
  currentTopic?: {
    id: string;
    name: string;
    description: string;
    estimatedQuestions?: number | undefined;
  } | undefined;

  // Previous answers
  answers?: Record<string, unknown> | undefined;
  answersSummary?: string | undefined;

  // Phase context
  phase?: 'cpo' | 'clarify' | 'cto' | undefined;
  workflow?: string | undefined;

  // Model being used
  model?: string | undefined;

  // CPO context for CTO phase
  cpoSummary?: string | undefined;
  techDecisionsSummary?: string | undefined;

  // Feature/module context
  featureId?: string | undefined;
  moduleName?: string | undefined;

  // Any other workflow state
  [key: string]: unknown;
}

/**
 * Prompt template metadata
 */
export interface PromptTemplate {
  name: string;
  path: string;
  workflow: string;
  operation: string;
  type: 'system' | 'user';
  compiled?: HandlebarsTemplateDelegate;
  lastModified?: Date;
}

/**
 * Handlebars template delegate type
 */
export type HandlebarsTemplateDelegate = (context: PromptContext) => string;

/**
 * Prompt compilation error
 */
export class PromptCompilationError extends Error {
  templateName: string;
  cause?: Error | undefined;

  constructor(templateName: string, message: string, cause?: Error | undefined) {
    super(message);
    this.name = 'PromptCompilationError';
    this.templateName = templateName;
    this.cause = cause;
  }
}

/**
 * Prompt not found error
 */
export class PromptNotFoundError extends Error {
  templateName: string;

  constructor(templateName: string) {
    super(`Prompt template not found: ${templateName}`);
    this.name = 'PromptNotFoundError';
    this.templateName = templateName;
  }
}
