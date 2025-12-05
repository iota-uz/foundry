/**
 * Question generation types
 */

/**
 * AI-generated question
 */
export interface AIQuestion {
  id: string;
  question: string;
  questionType: QuestionType;
  description?: string | undefined;
  options?: QuestionOption[] | undefined;
  validation?: ValidationRule | undefined;
  required: boolean;
  defaultValue?: unknown | undefined;
  context?: string | undefined; // Why AI is asking (DEPRECATED: use explainer)
  explainer?: QuestionExplainer | undefined;
  recommendation?: AIRecommendation | undefined;
}

/**
 * Question type
 */
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'text'
  | 'number'
  | 'date'
  | 'color'
  | 'code'
  | 'icon_picker'
  | 'component_variant'
  | 'comparison_table'
  | 'layout_template';

/**
 * Question option for choice questions
 */
export interface QuestionOption {
  id: string;
  label: string;
  description?: string | undefined;
  icon?: string | undefined;
  impactPreview?: ImpactPreview | undefined;
}

/**
 * Impact preview for options (Feature 7)
 */
export interface ImpactPreview {
  summary: string; // Brief impact summary
  specChanges: {
    sections: string[]; // Affected spec sections
    estimatedFields: number; // Approximate field count
  };
  additionalQuestions: {
    estimate: number; // Expected follow-up questions
    topics: string[]; // Topics of follow-up questions
  };
  dependencies: {
    creates: string[]; // New dependencies created
    removes: string[]; // Dependencies removed
  };
  pros: string[]; // Advantages
  cons: string[]; // Disadvantages
  reversibility: 'easy' | 'moderate' | 'significant'; // Effort to change later
}

/**
 * Question explainer (Feature 9)
 */
export interface QuestionExplainer {
  connection: string; // How this relates to previous answers
  purpose: string; // What this information will be used for
  downstream: {
    schemaImpact: string[]; // Schema sections affected
    apiImpact: string[]; // API endpoints affected
    componentImpact: string[]; // UI components affected
  };
  example?: {
    ifYouChoose: string; // Example option
    thenSpecWillHave: string; // Concrete spec outcome
  } | undefined;
  relatedAnswer?: {
    questionId: string;
    summary: string; // Summary of related previous answer
  } | undefined;
}

/**
 * AI recommendation (Feature 3)
 */
export interface AIRecommendation {
  recommendedOptionId: string; // ID of the suggested option
  confidence: 'high' | 'medium'; // Confidence level
  reasoning: string; // Why this is recommended (max 200 chars)
  source: RecommendationSource; // Basis for recommendation
  caveats?: string[] | undefined; // When NOT to choose this option
}

/**
 * Recommendation source
 */
export type RecommendationSource =
  | 'constitution' // Matches project constitution rule
  | 'best_practice' // Industry standard
  | 'context_inference' // Inferred from previous answers
  | 'majority_usage'; // Most common choice in similar projects

/**
 * Validation rule for input questions
 */
export interface ValidationRule {
  required?: boolean | undefined;
  min?: number | undefined;
  max?: number | undefined;
  minLength?: number | undefined;
  maxLength?: number | undefined;
  pattern?: string | undefined; // Regex for text
  message: string; // Error message
}

/**
 * Question batch (Feature 1)
 */
export interface QuestionBatch {
  batchId: string;
  topic: string;
  topicDescription: string;
  questions: AIQuestion[];
  estimatedTimeMinutes: number;
  batchPosition: {
    current: number; // Current batch number (1-indexed)
    total: number; // Total number of batches
    phase: 'cpo' | 'clarify' | 'cto';
  };
}

/**
 * Answer to a question
 */
export interface Answer {
  questionId: string;
  value: string | string[] | number | boolean; // Can be string, string[], number, or boolean
  answeredAt: string;
  skipped: boolean;
}

/**
 * Question generation parameters
 */
export interface QuestionGenParams {
  workflow: 'cpo' | 'cto';
  topic: string;
  topicDescription?: string | undefined;
  previousAnswers: Answer[];
  constitution?: Record<string, unknown> | undefined;
  questionCount?: number | undefined; // How many questions already asked in this topic
}

/**
 * Batch generation parameters
 */
export interface BatchGenParams extends QuestionGenParams {
  batchSize: number; // Number of questions to generate (max 7)
  currentBatch: number;
  totalBatches: number;
}
