/**
 * Recommendation Service
 *
 * Provides AI recommendations for question options.
 * Used in F16 - AI Recommendation Badges.
 */

import type { AIQuestion, AIRecommendation } from '@/types/ai';
import {
  calculateRecommendationConfidence,
  generateRecommendation,
  shouldRecommend,
  type RecommendationContext,
} from '@/lib/utils/recommendation-engine';

export class RecommendationService {
  private context: RecommendationContext = {};

  /**
   * Set constitution for recommendation context
   */
  setConstitution(constitution: Record<string, any>): void {
    this.context.constitution = constitution;
  }

  /**
   * Set previous answers for context inference
   */
  setPreviousAnswers(answers: Array<{ question: string; answer: any }>): void {
    this.context.previousAnswers = answers;
  }

  /**
   * Set project type
   */
  setProjectType(projectType: string): void {
    this.context.projectType = projectType;
  }

  /**
   * Add industry best practices
   */
  addBestPractices(practices: string[]): void {
    if (!this.context.industryBestPractices) {
      this.context.industryBestPractices = [];
    }
    this.context.industryBestPractices.push(...practices);
  }

  /**
   * Generate recommendation for a question
   */
  generateRecommendation(question: AIQuestion): AIRecommendation | null {
    // Check if we should recommend at all
    if (!question.options || question.options.length === 0) {
      return null;
    }

    if (!shouldRecommend(question.question, question.options)) {
      return null;
    }

    // Determine best option
    const recommendedOptionId = this.selectBestOption(question);
    if (!recommendedOptionId) {
      return null;
    }

    // Calculate confidence
    const score = calculateRecommendationConfidence(
      question.question,
      question.options,
      recommendedOptionId,
      this.context
    );

    // Only return recommendation if confidence is sufficient
    if (score.confidence === 'none') {
      return null;
    }

    return generateRecommendation(recommendedOptionId, score);
  }

  /**
   * Select best option from available choices
   */
  private selectBestOption(question: AIQuestion): string | null {
    if (!question.options || question.options.length === 0) {
      return null;
    }

    // Score each option
    const optionScores = question.options.map(option => {
      const score = calculateRecommendationConfidence(
        question.question,
        question.options!,
        option.id,
        this.context
      );

      return {
        optionId: option.id,
        score: score.score,
        confidence: score.confidence,
      };
    });

    // Sort by score
    optionScores.sort((a, b) => b.score - a.score);

    // Return best option if it has sufficient confidence
    const best = optionScores[0];
    if (!best || best.confidence === 'none') {
      return null;
    }

    return best.optionId;
  }

  /**
   * Batch process multiple questions for recommendations
   */
  generateBatchRecommendations(questions: AIQuestion[]): Map<string, AIRecommendation | null> {
    const recommendations = new Map<string, AIRecommendation | null>();

    for (const question of questions) {
      const recommendation = this.generateRecommendation(question);
      recommendations.set(question.id, recommendation);
    }

    return recommendations;
  }

  /**
   * Update context with new answer
   */
  updateContextWithAnswer(question: string, answer: any): void {
    if (!this.context.previousAnswers) {
      this.context.previousAnswers = [];
    }

    this.context.previousAnswers.push({ question, answer });

    // Keep only last 20 answers for performance
    if (this.context.previousAnswers.length > 20) {
      this.context.previousAnswers = this.context.previousAnswers.slice(-20);
    }
  }

  /**
   * Clear context (e.g., when starting new workflow)
   */
  clearContext(): void {
    this.context = {
      constitution: this.context.constitution || {}, // Keep constitution or use empty object
    };
  }

  /**
   * Get current context
   */
  getContext(): RecommendationContext {
    return { ...this.context };
  }
}

// Singleton instance
let recommendationServiceInstance: RecommendationService | null = null;

/**
 * Get recommendation service instance
 */
export function getRecommendationService(): RecommendationService {
  if (!recommendationServiceInstance) {
    recommendationServiceInstance = new RecommendationService();
  }
  return recommendationServiceInstance;
}
