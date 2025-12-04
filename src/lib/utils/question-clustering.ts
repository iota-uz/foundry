/**
 * Question Clustering Utility
 *
 * Groups questions by semantic topic for F14 - Smart Question Batching.
 * Based on Miller's Law (7±2 cognitive limit), creates batches of 3-5 questions.
 */

import type { AIQuestion, QuestionBatch } from '@/types/ai';

export interface ClusteringOptions {
  minBatchSize?: number;
  maxBatchSize?: number;
  topicKeywords?: Record<string, string[]>;
}

const DEFAULT_OPTIONS: Required<ClusteringOptions> = {
  minBatchSize: 3,
  maxBatchSize: 5,
  topicKeywords: {
    authentication: ['auth', 'login', 'password', 'session', 'token', 'user', 'credential'],
    authorization: ['permission', 'role', 'access', 'policy', 'privilege', 'rbac'],
    data_model: ['database', 'schema', 'entity', 'table', 'field', 'column', 'relationship'],
    api_design: ['endpoint', 'api', 'rest', 'graphql', 'request', 'response', 'http'],
    ui_components: ['component', 'ui', 'interface', 'screen', 'page', 'form', 'button'],
    validation: ['validate', 'validation', 'error', 'constraint', 'rule', 'check'],
    performance: ['performance', 'cache', 'optimize', 'speed', 'latency', 'scale'],
    security: ['security', 'encrypt', 'secure', 'vulnerability', 'attack', 'safe'],
    integration: ['integrate', 'api', 'third-party', 'external', 'service', 'webhook'],
    testing: ['test', 'testing', 'qa', 'spec', 'assertion', 'coverage'],
  },
};

/**
 * Cluster questions into semantic batches
 */
export function clusterQuestions(
  questions: AIQuestion[],
  options: ClusteringOptions = {},
  phase: 'cpo' | 'clarify' | 'cto' = 'cpo'
): QuestionBatch[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (questions.length === 0) {
    return [];
  }

  // Score each question against each topic
  const questionTopics = questions.map(question => ({
    question,
    topicScores: scoreQuestionTopics(question, opts.topicKeywords),
  }));

  // Group questions by primary topic
  const topicGroups = new Map<string, typeof questionTopics>();

  for (const qt of questionTopics) {
    const primaryTopic = qt.topicScores[0]?.topic || 'general';

    if (!topicGroups.has(primaryTopic)) {
      topicGroups.set(primaryTopic, []);
    }
    topicGroups.get(primaryTopic)!.push(qt);
  }

  // Convert groups to batches, splitting large groups
  const batches: QuestionBatch[] = [];
  let batchIndex = 1;
  const totalBatches = Math.ceil(questions.length / opts.maxBatchSize);

  for (const [topic, group] of topicGroups.entries()) {
    // Split large groups into multiple batches
    for (let i = 0; i < group.length; i += opts.maxBatchSize) {
      const batchQuestions = group.slice(i, i + opts.maxBatchSize).map(qt => qt.question);

      // Only create batch if it meets minimum size (except for last batch)
      if (batchQuestions.length >= opts.minBatchSize || i + opts.maxBatchSize >= group.length) {
        const batch: QuestionBatch = {
          batchId: `batch-${batchIndex}`,
          topic: formatTopicName(topic),
          topicDescription: generateTopicDescription(topic, batchQuestions),
          questions: batchQuestions,
          batchPosition: {
            current: batchIndex,
            total: totalBatches,
            phase,
          },
          estimatedTimeMinutes: estimateCompletionTime(batchQuestions),
        };

        batches.push(batch);
        batchIndex++;
      }
    }
  }

  return batches;
}

/**
 * Score a question against all topics
 */
function scoreQuestionTopics(
  question: AIQuestion,
  topicKeywords: Record<string, string[]>
): Array<{ topic: string; score: number }> {
  const text = `${question.question} ${question.description || ''}`.toLowerCase();

  const scores = Object.entries(topicKeywords).map(([topic, keywords]) => {
    let score = 0;

    for (const keyword of keywords) {
      // Exact word match
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 2; // Weight exact matches higher
      }

      // Partial match
      if (text.includes(keyword)) {
        score += 1;
      }
    }

    return { topic, score };
  });

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Format topic name for display
 */
function formatTopicName(topic: string): string {
  return topic
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate a contextual description for the topic batch
 */
function generateTopicDescription(topic: string, questions: AIQuestion[]): string {
  const descriptions: Record<string, string> = {
    authentication: 'Questions about user authentication and login mechanisms',
    authorization: 'Questions about user permissions and access control',
    data_model: 'Questions about database schema and data structures',
    api_design: 'Questions about API endpoints and contract design',
    ui_components: 'Questions about user interface components and layouts',
    validation: 'Questions about data validation and error handling',
    performance: 'Questions about system performance and optimization',
    security: 'Questions about security measures and protections',
    integration: 'Questions about external integrations and services',
    testing: 'Questions about testing strategies and quality assurance',
    general: 'General questions about the project',
  };

  const baseDescription = descriptions[topic] || descriptions.general;

  // Add question count context
  if (questions.length === 1) {
    return `${baseDescription} (1 question)`;
  }

  return `${baseDescription} (${questions.length} questions)`;
}

/**
 * Estimate completion time for a batch in minutes
 */
function estimateCompletionTime(questions: AIQuestion[]): number {
  let totalMinutes = 0;

  for (const question of questions) {
    // Base time per question
    let questionTime = 1;

    // Add time based on question type
    switch (question.questionType) {
      case 'text':
      case 'code':
        questionTime = 3; // Text/code requires more thought
        break;
      case 'multiple_choice':
        questionTime = 2; // Multiple choice takes longer to evaluate
        break;
      case 'single_choice':
        questionTime = 1.5;
        break;
      default:
        questionTime = 1;
    }

    // Add time for number of options (if applicable)
    if (question.options && question.options.length > 5) {
      questionTime += 1;
    }

    totalMinutes += questionTime;
  }

  // Round up to nearest minute
  return Math.ceil(totalMinutes);
}

/**
 * Re-cluster questions dynamically based on previous answers
 * This allows for adaptive batching as the workflow progresses
 */
export function adaptiveClustering(
  remainingQuestions: AIQuestion[],
  answeredQuestions: Array<{ question: AIQuestion; answer: string | string[] | number | boolean }>,
  options: ClusteringOptions = {},
  phase: 'cpo' | 'clarify' | 'cto' = 'cpo'
): QuestionBatch[] {
  // Analyze answered questions to identify emerging topics
  const answeredTopics = answeredQuestions.map(qa =>
    scoreQuestionTopics(qa.question, options.topicKeywords || DEFAULT_OPTIONS.topicKeywords)
  );

  // Find dominant topics from answered questions
  const topicFrequency = new Map<string, number>();
  for (const topics of answeredTopics) {
    const primaryTopic = topics[0]?.topic;
    if (primaryTopic) {
      topicFrequency.set(primaryTopic, (topicFrequency.get(primaryTopic) || 0) + 1);
    }
  }

  // Prioritize questions from active topics
  const sortedByRelevance = [...remainingQuestions].sort((a, b) => {
    const aTopics = scoreQuestionTopics(a, options.topicKeywords || DEFAULT_OPTIONS.topicKeywords);
    const bTopics = scoreQuestionTopics(b, options.topicKeywords || DEFAULT_OPTIONS.topicKeywords);

    const aFreq = topicFrequency.get(aTopics[0]?.topic || '') || 0;
    const bFreq = topicFrequency.get(bTopics[0]?.topic || '') || 0;

    return bFreq - aFreq;
  });

  return clusterQuestions(sortedByRelevance, options, phase);
}

/**
 * Merge small batches to avoid too many context switches
 */
export function optimizeBatches(
  batches: QuestionBatch[],
  minBatchSize: number = 3
): QuestionBatch[] {
  const optimized: QuestionBatch[] = [];
  let pendingBatch: QuestionBatch | null = null;

  for (const batch of batches) {
    if (batch.questions.length < minBatchSize && pendingBatch) {
      // Merge with pending batch if same topic
      if (pendingBatch.topic === batch.topic) {
        pendingBatch = {
          ...pendingBatch,
          questions: [...pendingBatch.questions, ...batch.questions],
          estimatedTimeMinutes: pendingBatch.estimatedTimeMinutes + batch.estimatedTimeMinutes,
        } as QuestionBatch;
      } else {
        // Different topic, push pending and start new
        optimized.push(pendingBatch);
        pendingBatch = batch;
      }
    } else if (batch.questions.length < minBatchSize) {
      // Hold for merging
      pendingBatch = batch;
    } else {
      // Large enough, push directly
      if (pendingBatch) {
        optimized.push(pendingBatch);
        pendingBatch = null;
      }
      optimized.push(batch);
    }
  }

  // Add remaining pending batch
  if (pendingBatch) {
    optimized.push(pendingBatch);
  }

  // Update batch positions
  return optimized.map((batch, index) => ({
    ...batch,
    batchId: `batch-${index + 1}`,
    batchPosition: {
      current: index + 1,
      total: optimized.length,
      phase: batch.batchPosition.phase,
    },
  }));
}
