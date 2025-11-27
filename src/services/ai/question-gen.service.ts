/**
 * QuestionGenService - AI-driven question generation
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';
import type {
  AIQuestion,
  QuestionBatch,
  QuestionGenParams,
  BatchGenParams,
  Answer,
  QuestionExplainer,
  AIRecommendation,
  ImpactPreview,
} from '@/types/ai';
import { LLMService } from './llm.service';
import { PromptService } from './prompt.service';

/**
 * Zod schema for question generation output
 */
const QuestionSchema = z.object({
  question: z.string().describe('The question text'),
  questionType: z
    .enum([
      'single_choice',
      'multiple_choice',
      'text',
      'number',
      'date',
      'color',
      'code',
    ])
    .describe('Type of question'),
  description: z.string().optional().describe('Additional context'),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
      })
    )
    .optional()
    .describe('Options for choice questions'),
  validation: z
    .object({
      required: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string(),
    })
    .optional()
    .describe('Validation rules'),
  required: z.boolean().default(true),
  defaultValue: z.any().optional(),
});

/**
 * Zod schema for question batch generation
 */
const QuestionBatchSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(7),
});

/**
 * Zod schema for explainer generation
 */
const ExplainerSchema = z.object({
  connection: z.string(),
  purpose: z.string(),
  downstream: z.object({
    schemaImpact: z.array(z.string()),
    apiImpact: z.array(z.string()),
    componentImpact: z.array(z.string()),
  }),
  example: z
    .object({
      ifYouChoose: z.string(),
      thenSpecWillHave: z.string(),
    })
    .optional(),
  relatedAnswer: z
    .object({
      questionId: z.string(),
      summary: z.string(),
    })
    .optional(),
});

/**
 * Zod schema for recommendation generation
 */
const RecommendationSchema = z.object({
  recommendedOptionId: z.string(),
  confidence: z.enum(['high', 'medium']),
  reasoning: z.string().max(200),
  source: z.enum(['constitution', 'best_practice', 'context_inference', 'majority_usage']),
  caveats: z.array(z.string()).optional(),
});

/**
 * Zod schema for impact preview generation
 */
const ImpactPreviewSchema = z.object({
  summary: z.string(),
  specChanges: z.object({
    sections: z.array(z.string()),
    estimatedFields: z.number(),
  }),
  additionalQuestions: z.object({
    estimate: z.number(),
    topics: z.array(z.string()),
  }),
  dependencies: z.object({
    creates: z.array(z.string()),
    removes: z.array(z.string()),
  }),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  reversibility: z.enum(['easy', 'moderate', 'significant']),
});

/**
 * QuestionGenService handles AI-driven question generation
 */
export class QuestionGenService {
  constructor(
    private llmService: LLMService,
    private promptService: PromptService
  ) {}

  /**
   * Generate a single question for a topic
   */
  async generateQuestion(params: QuestionGenParams): Promise<AIQuestion> {
    const { workflow, topic, topicDescription, previousAnswers, constitution, questionCount } =
      params;

    // Build context for prompt
    const context = {
      currentTopic: {
        id: topic,
        name: topic,
        description: topicDescription || '',
      },
      answers: this.formatAnswersForContext(previousAnswers),
      answersSummary: this.summarizeAnswers(previousAnswers),
      phase: workflow,
      workflow,
      questionCount: questionCount || 0,
    };

    // Compile prompts
    const systemPrompt = await this.promptService.compilePrompt(
      `${workflow}-generate-question-system`,
      context
    );
    const userPrompt = await this.promptService.compilePrompt(
      `${workflow}-generate-question-user`,
      context
    );

    // Call LLM with structured output
    const response = await this.llmService.call({
      model: 'sonnet',
      systemPrompt,
      userPrompt,
      outputSchema: QuestionSchema,
      maxTokens: 500,
      constitution,
    });

    // Build full question object
    const questionData = response.structured;
    const question: AIQuestion = {
      id: nanoid(),
      question: questionData.question,
      questionType: questionData.questionType,
      description: questionData.description,
      options: questionData.options?.map((opt: any) => ({
        ...opt,
        id: opt.id || nanoid(),
      })),
      validation: questionData.validation,
      required: questionData.required ?? true,
      defaultValue: questionData.defaultValue,
    };

    return question;
  }

  /**
   * Generate a batch of related questions
   */
  async generateBatch(params: BatchGenParams): Promise<QuestionBatch> {
    const {
      workflow,
      topic,
      topicDescription,
      previousAnswers,
      constitution,
      batchSize,
      currentBatch,
      totalBatches,
    } = params;

    // Build context
    const context = {
      currentTopic: {
        id: topic,
        name: topic,
        description: topicDescription || '',
      },
      answers: this.formatAnswersForContext(previousAnswers),
      answersSummary: this.summarizeAnswers(previousAnswers),
      phase: workflow,
      workflow,
      batchSize,
      currentBatch,
      totalBatches,
    };

    // Compile prompts
    const systemPrompt = await this.promptService.compilePrompt(
      `${workflow}-generate-batch-system`,
      context
    );
    const userPrompt = await this.promptService.compilePrompt(
      `${workflow}-generate-batch-user`,
      context
    );

    // Call LLM
    const response = await this.llmService.call({
      model: 'sonnet',
      systemPrompt,
      userPrompt,
      outputSchema: QuestionBatchSchema,
      maxTokens: 2000,
      constitution,
    });

    // Build batch object
    const batchData = response.structured;
    const questions: AIQuestion[] = batchData.questions.map((q: any) => ({
      id: nanoid(),
      question: q.question,
      questionType: q.questionType,
      description: q.description,
      options: q.options?.map((opt: any) => ({
        ...opt,
        id: opt.id || nanoid(),
      })),
      validation: q.validation,
      required: q.required ?? true,
      defaultValue: q.defaultValue,
    }));

    // Estimate time (rough: 1 min per question)
    const estimatedTimeMinutes = questions.length;

    return {
      batchId: nanoid(),
      topic,
      topicDescription: topicDescription || '',
      questions,
      estimatedTimeMinutes,
      batchPosition: {
        current: currentBatch,
        total: totalBatches,
        phase: workflow,
      },
    };
  }

  /**
   * Generate recommendation for a question
   */
  async generateRecommendation(
    question: AIQuestion,
    context: {
      previousAnswers: Answer[];
      constitution?: any;
      workflow: 'cpo' | 'cto';
    }
  ): Promise<AIRecommendation | null> {
    // Only generate recommendations for choice questions
    if (
      !question.options ||
      (question.questionType !== 'single_choice' && question.questionType !== 'multiple_choice')
    ) {
      return null;
    }

    const promptContext = {
      question: question.question,
      options: question.options,
      answers: this.formatAnswersForContext(context.previousAnswers),
      answersSummary: this.summarizeAnswers(context.previousAnswers),
      phase: context.workflow,
      hasConstitution: !!context.constitution,
    };

    const systemPrompt = await this.promptService.compilePrompt(
      'recommendation-generate-system',
      promptContext
    );
    const userPrompt = await this.promptService.compilePrompt(
      'recommendation-generate-user',
      promptContext
    );

    try {
      const response = await this.llmService.call({
        model: 'sonnet',
        systemPrompt,
        userPrompt,
        outputSchema: RecommendationSchema,
        maxTokens: 300,
        constitution: context.constitution,
      });

      return response.structured as AIRecommendation;
    } catch (error) {
      // If AI can't generate a strong recommendation, return null
      console.warn('Failed to generate recommendation:', error);
      return null;
    }
  }

  /**
   * Generate explainer for a question
   */
  async generateExplainer(
    question: AIQuestion,
    context: {
      previousAnswers: Answer[];
      workflow: 'cpo' | 'cto';
      topic: string;
    }
  ): Promise<QuestionExplainer> {
    const promptContext = {
      question: question.question,
      questionType: question.questionType,
      answers: this.formatAnswersForContext(context.previousAnswers),
      answersSummary: this.summarizeAnswers(context.previousAnswers),
      phase: context.workflow,
      topic: context.topic,
    };

    const systemPrompt = await this.promptService.compilePrompt(
      'explainer-generate-system',
      promptContext
    );
    const userPrompt = await this.promptService.compilePrompt(
      'explainer-generate-user',
      promptContext
    );

    const response = await this.llmService.call({
      model: 'haiku', // Fast model for explainers
      systemPrompt,
      userPrompt,
      outputSchema: ExplainerSchema,
      maxTokens: 400,
    });

    return response.structured as QuestionExplainer;
  }

  /**
   * Generate impact preview for an option
   */
  async generateImpactPreview(
    question: AIQuestion,
    optionId: string,
    context: {
      previousAnswers: Answer[];
      workflow: 'cpo' | 'cto';
      topic: string;
    }
  ): Promise<ImpactPreview> {
    const option = question.options?.find((opt) => opt.id === optionId);
    if (!option) {
      throw new Error(`Option ${optionId} not found in question`);
    }

    const promptContext = {
      question: question.question,
      option,
      answers: this.formatAnswersForContext(context.previousAnswers),
      answersSummary: this.summarizeAnswers(context.previousAnswers),
      phase: context.workflow,
      topic: context.topic,
    };

    const systemPrompt = await this.promptService.compilePrompt(
      'impact-preview-generate-system',
      promptContext
    );
    const userPrompt = await this.promptService.compilePrompt(
      'impact-preview-generate-user',
      promptContext
    );

    const response = await this.llmService.call({
      model: 'sonnet',
      systemPrompt,
      userPrompt,
      outputSchema: ImpactPreviewSchema,
      maxTokens: 500,
    });

    return response.structured as ImpactPreview;
  }

  /**
   * Format answers for LLM context
   */
  private formatAnswersForContext(answers: Answer[]): Record<string, any> {
    const formatted: Record<string, any> = {};
    answers.forEach((answer) => {
      if (!answer.skipped) {
        formatted[answer.questionId] = answer.value;
      }
    });
    return formatted;
  }

  /**
   * Summarize answers as readable text for prompts
   */
  private summarizeAnswers(answers: Answer[]): string {
    if (answers.length === 0) {
      return 'No previous answers yet.';
    }

    const lines: string[] = [];
    answers.forEach((answer, index) => {
      if (!answer.skipped) {
        const value =
          typeof answer.value === 'object'
            ? JSON.stringify(answer.value)
            : String(answer.value);
        lines.push(`${index + 1}. ${answer.questionId}: ${value}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Generate follow-up question based on a previous answer
   */
  async generateFollowUp(
    previousQuestion: AIQuestion,
    answer: Answer,
    context: {
      workflow: 'cpo' | 'cto';
      topic: string;
      constitution?: any;
    }
  ): Promise<AIQuestion | null> {
    const promptContext = {
      previousQuestion: previousQuestion.question,
      previousAnswer: answer.value,
      phase: context.workflow,
      topic: context.topic,
    };

    const systemPrompt = await this.promptService.compilePrompt(
      'followup-check-system',
      promptContext
    );
    const userPrompt = await this.promptService.compilePrompt(
      'followup-check-user',
      promptContext
    );

    // First check if follow-up is needed
    const checkSchema = z.object({
      followUpNeeded: z.boolean(),
      reason: z.string().optional(),
    });

    const checkResponse = await this.llmService.call({
      model: 'haiku',
      systemPrompt,
      userPrompt,
      outputSchema: checkSchema,
      maxTokens: 200,
      constitution: context.constitution,
    });

    if (!checkResponse.structured.followUpNeeded) {
      return null;
    }

    // Generate follow-up question
    const genContext = {
      ...promptContext,
      followUpReason: checkResponse.structured.reason,
    };

    const genSystemPrompt = await this.promptService.compilePrompt(
      'followup-generate-system',
      genContext
    );
    const genUserPrompt = await this.promptService.compilePrompt(
      'followup-generate-user',
      genContext
    );

    const response = await this.llmService.call({
      model: 'sonnet',
      systemPrompt: genSystemPrompt,
      userPrompt: genUserPrompt,
      outputSchema: QuestionSchema,
      maxTokens: 500,
      constitution: context.constitution,
    });

    const questionData = response.structured;
    return {
      id: nanoid(),
      question: questionData.question,
      questionType: questionData.questionType,
      description: questionData.description,
      options: questionData.options?.map((opt: any) => ({
        ...opt,
        id: opt.id || nanoid(),
      })),
      validation: questionData.validation,
      required: questionData.required ?? true,
      defaultValue: questionData.defaultValue,
    };
  }
}

/**
 * Create QuestionGenService instance
 */
export function createQuestionGenService(
  llmService: LLMService,
  promptService: PromptService
): QuestionGenService {
  return new QuestionGenService(llmService, promptService);
}
