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
    estimatedQuestions?: number;
  };

  // Previous answers
  answers?: Record<string, any>;
  answersSummary?: string;

  // Phase context
  phase?: 'cpo' | 'clarify' | 'cto';
  workflow?: string;

  // Model being used
  model?: string;

  // CPO context for CTO phase
  cpoSummary?: string;
  techDecisionsSummary?: string;

  // Feature/module context
  featureId?: string;
  moduleName?: string;

  // Any other workflow state
  [key: string]: any;
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
export type HandlebarsTemplateDelegate = (context: any) => string;

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
