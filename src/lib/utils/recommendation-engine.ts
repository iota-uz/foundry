/**
 * Recommendation Engine
 *
 * Calculates confidence levels for AI recommendations.
 * Used in F16 - AI Recommendation Badges.
 */

import type { AIRecommendation } from '@/types/ai';

export interface RecommendationContext {
  constitution?: Record<string, unknown>;
  previousAnswers?: Array<{ question: string; answer: string | string[] | number | boolean }>;
  industryBestPractices?: string[];
  projectType?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'none';

export interface RecommendationScore {
  confidence: ConfidenceLevel;
  score: number; // 0-100
  sources: Array<{
    type: 'constitution' | 'best_practice' | 'context_inference' | 'majority_usage';
    weight: number;
    rationale: string;
  }>;
}

/**
 * Calculate recommendation confidence
 */
export function calculateRecommendationConfidence(
  question: string,
  options: Array<{ id: string; label: string; description?: string }>,
  recommendedOptionId: string,
  context: RecommendationContext
): RecommendationScore {
  const sources: RecommendationScore['sources'] = [];
  let totalScore = 0;

  // Check constitution rules (highest weight)
  if (context.constitution) {
    const constitutionScore = checkConstitution(
      question,
      recommendedOptionId,
      options,
      context.constitution
    );
    if (constitutionScore.matches) {
      sources.push({
        type: 'constitution',
        weight: 40,
        rationale: constitutionScore.rationale,
      });
      totalScore += 40;
    }
  }

  // Check best practices (medium-high weight)
  const bestPracticeScore = checkBestPractices(
    question,
    recommendedOptionId,
    options,
    context.industryBestPractices || []
  );
  if (bestPracticeScore.matches) {
    sources.push({
      type: 'best_practice',
      weight: 30,
      rationale: bestPracticeScore.rationale,
    });
    totalScore += 30;
  }

  // Check context from previous answers (medium weight)
  if (context.previousAnswers && context.previousAnswers.length > 0) {
    const contextScore = inferFromContext(
      question,
      recommendedOptionId,
      options,
      context.previousAnswers
    );
    if (contextScore.matches) {
      sources.push({
        type: 'context_inference',
        weight: 20,
        rationale: contextScore.rationale,
      });
      totalScore += 20;
    }
  }

  // Check majority usage patterns (low weight)
  const majorityScore = checkMajorityUsage(
    question,
    recommendedOptionId,
    context.projectType || 'general'
  );
  if (majorityScore.matches) {
    sources.push({
      type: 'majority_usage',
      weight: 10,
      rationale: majorityScore.rationale,
    });
    totalScore += 10;
  }

  // Determine confidence level
  let confidence: ConfidenceLevel = 'none';
  if (totalScore >= 80) {
    confidence = 'high';
  } else if (totalScore >= 50) {
    confidence = 'medium';
  }

  return {
    confidence,
    score: totalScore,
    sources,
  };
}

/**
 * Check if recommendation matches constitution rules
 */
function checkConstitution(
  question: string,
  recommendedOptionId: string,
  options: Array<{ id: string; label: string }>,
  constitution: Record<string, unknown>
): { matches: boolean; rationale: string } {
  const questionLower = question.toLowerCase();

  // Check naming conventions
  if (constitution.naming) {
    if (questionLower.includes('naming') || questionLower.includes('convention')) {
      const option = options.find(o => o.id === recommendedOptionId);
      if (option && option.label.toLowerCase().includes(constitution.naming.style)) {
        return {
          matches: true,
          rationale: `Matches project naming convention: ${constitution.naming.style}`,
        };
      }
    }
  }

  // Check architecture preferences
  if (constitution.architecture) {
    if (questionLower.includes('architecture') || questionLower.includes('pattern')) {
      const preferredStyle = constitution.architecture.style;
      const option = options.find(o => o.id === recommendedOptionId);
      if (option && option.label.toLowerCase().includes(preferredStyle.toLowerCase())) {
        return {
          matches: true,
          rationale: `Aligns with project architecture: ${preferredStyle}`,
        };
      }
    }
  }

  // Check technology stack preferences
  if (constitution.stack) {
    const stackKeywords = Object.keys(constitution.stack).map(k => k.toLowerCase());
    const option = options.find(o => o.id === recommendedOptionId);
    if (option) {
      const optionText = option.label.toLowerCase();
      for (const keyword of stackKeywords) {
        if (optionText.includes(keyword)) {
          return {
            matches: true,
            rationale: `Matches project tech stack preference: ${keyword}`,
          };
        }
      }
    }
  }

  return { matches: false, rationale: '' };
}

/**
 * Check if recommendation follows industry best practices
 */
function checkBestPractices(
  question: string,
  recommendedOptionId: string,
  options: Array<{ id: string; label: string }>,
  bestPractices: string[]
): { matches: boolean; rationale: string } {
  const questionLower = question.toLowerCase();
  const option = options.find(o => o.id === recommendedOptionId);

  if (!option) {
    return { matches: false, rationale: '' };
  }

  const optionLower = option.label.toLowerCase();

  // Security best practices
  if (questionLower.includes('security') || questionLower.includes('authentication')) {
    if (optionLower.includes('oauth') || optionLower.includes('mfa') || optionLower.includes('encryption')) {
      return {
        matches: true,
        rationale: 'Industry standard for secure authentication',
      };
    }
  }

  // Database best practices
  if (questionLower.includes('database') || questionLower.includes('storage')) {
    if (optionLower.includes('postgresql') || optionLower.includes('mysql')) {
      return {
        matches: true,
        rationale: 'Widely adopted production-ready database',
      };
    }
  }

  // API design best practices
  if (questionLower.includes('api') || questionLower.includes('endpoint')) {
    if (optionLower.includes('rest') || optionLower.includes('graphql')) {
      return {
        matches: true,
        rationale: 'Standard API design pattern',
      };
    }
  }

  // Check custom best practices
  for (const practice of bestPractices) {
    if (optionLower.includes(practice.toLowerCase())) {
      return {
        matches: true,
        rationale: `Follows best practice: ${practice}`,
      };
    }
  }

  return { matches: false, rationale: '' };
}

/**
 * Infer recommendation from previous answers
 */
function inferFromContext(
  question: string,
  recommendedOptionId: string,
  options: Array<{ id: string; label: string }>,
  previousAnswers: Array<{ question: string; answer: string | string[] | number | boolean }>
): { matches: boolean; rationale: string } {
  const option = options.find(o => o.id === recommendedOptionId);
  if (!option) {
    return { matches: false, rationale: '' };
  }

  const questionLower = question.toLowerCase();
  const optionLower = option.label.toLowerCase();

  // Look for related previous answers
  for (const prev of previousAnswers) {
    const prevQuestionLower = prev.question.toLowerCase();
    const prevAnswerLower = String(prev.answer).toLowerCase();

    // Check for consistency patterns
    if (questionLower.includes('authentication') && prevQuestionLower.includes('user')) {
      if (optionLower.includes('oauth') && prevAnswerLower.includes('social')) {
        return {
          matches: true,
          rationale: 'Consistent with previous choice of social login',
        };
      }
    }

    // Check for technology stack consistency
    if (prevQuestionLower.includes('database') || prevQuestionLower.includes('backend')) {
      const techMatch = extractTechnology(prevAnswerLower);
      if (techMatch && optionLower.includes(techMatch)) {
        return {
          matches: true,
          rationale: `Consistent with ${techMatch} stack choice`,
        };
      }
    }
  }

  return { matches: false, rationale: '' };
}

/**
 * Extract technology keywords from text
 */
function extractTechnology(text: string): string | null {
  const technologies = [
    'react', 'vue', 'angular', 'svelte',
    'node', 'python', 'java', 'go', 'rust',
    'postgresql', 'mysql', 'mongodb', 'redis',
  ];

  for (const tech of technologies) {
    if (text.includes(tech)) {
      return tech;
    }
  }

  return null;
}

/**
 * Check if option represents majority usage
 */
function checkMajorityUsage(
  question: string,
  recommendedOptionId: string,
  projectType: string
): { matches: boolean; rationale: string } {
  const questionLower = question.toLowerCase();

  // Common patterns for web applications
  if (projectType === 'web' || projectType === 'general') {
    if (questionLower.includes('authentication')) {
      if (recommendedOptionId.includes('oauth') || recommendedOptionId.includes('email')) {
        return {
          matches: true,
          rationale: 'Most commonly used authentication method',
        };
      }
    }

    if (questionLower.includes('database')) {
      if (recommendedOptionId.includes('postgresql') || recommendedOptionId.includes('mysql')) {
        return {
          matches: true,
          rationale: 'Popular choice for web applications',
        };
      }
    }
  }

  return { matches: false, rationale: '' };
}

/**
 * Generate AIRecommendation from score
 */
export function generateRecommendation(
  recommendedOptionId: string,
  score: RecommendationScore
): AIRecommendation | null {
  if (score.confidence === 'none') {
    return null;
  }

  // Use the primary source type
  const primarySource = score.sources[0];

  return {
    recommendedOptionId,
    confidence: score.confidence,
    source: primarySource?.type || 'best_practice',
    reasoning: score.sources.map(s => s.rationale).join('. '),
  };
}

/**
 * Should we recommend for this question?
 * Returns false for high-stakes business decisions
 */
export function shouldRecommend(question: string, options: Array<{ id: string; label: string }>): boolean {
  const questionLower = question.toLowerCase();

  // Don't recommend for business-critical decisions
  const highStakesKeywords = [
    'pricing', 'price', 'cost', 'budget',
    'cut', 'remove', 'delete',
    'priority', 'priorities',
  ];

  for (const keyword of highStakesKeywords) {
    if (questionLower.includes(keyword)) {
      return false;
    }
  }

  // Don't recommend when all options are equally valid
  if (options.length === 2 && questionLower.includes('prefer')) {
    return false;
  }

  return true;
}
