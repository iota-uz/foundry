'use client';

/**
 * Question Card Component
 *
 * Displays a single question with answer options and actions.
 * Updated for current design system with modern minimal dark theme.
 */

import { useState, useCallback } from 'react';
import type { AIQuestion } from '@/lib/planning/types';
import { OptionList } from './option-list';
import { TextInput } from './text-input';
import { CodeInput } from './code-input';
import { RecommendationBadge } from './recommendation-badge';
import { KeyboardHints } from './keyboard-hints';
import { Explainer } from './explainer';

interface QuestionCardProps {
  question: AIQuestion;
  onAnswer: (answer: unknown) => void;
  onSkip?: () => void;
  disabled?: boolean;
  showRecommendation?: boolean;
  showExplainer?: boolean;
  showKeyboardHints?: boolean;
  onImpactPreview?: (optionId: string | null) => void;
}

export function QuestionCard({
  question,
  onAnswer,
  onSkip,
  disabled = false,
  showRecommendation = true,
  showExplainer = true,
  showKeyboardHints = true,
  onImpactPreview,
}: QuestionCardProps) {
  const [answer, setAnswer] = useState<string | string[] | number | boolean | null>(null);
  const [expandedExplainer, setExpandedExplainer] = useState(
    question.whyAsking && (question.questionType === 'text' || question.questionType === 'code')
  );

  const handleAnswer = useCallback(() => {
    if (answer !== null && answer !== '') {
      onAnswer(answer);
      setAnswer(null);
    }
  }, [answer, onAnswer]);

  const handleOptionSelect = useCallback(
    (selected: string | string[], isMultiple: boolean) => {
      if (isMultiple) {
        // For multiple choice, don't auto-submit
        setAnswer(selected);
      } else {
        // For single choice, auto-submit
        onAnswer(selected);
        setAnswer(null);
      }
    },
    [onAnswer]
  );

  const handleSubmitMultiple = useCallback(() => {
    if (answer && Array.isArray(answer) && answer.length > 0) {
      onAnswer(answer);
      setAnswer(null);
    }
  }, [answer, onAnswer]);

  const answerOptionsCount = question.options?.length || 0;

  // Check if question has recommendation
  const recommendedOption = question.options?.find(opt => opt.isRecommended);
  const recommendation = recommendedOption ? {
    confidence: 'high' as const,
    reasoning: recommendedOption.recommendationReason || 'Recommended based on best practices',
  } : undefined;

  return (
    <div className="w-full space-y-4 rounded-lg border border-border-default bg-bg-secondary p-6">
      {/* Question header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-text-primary">{question.question}</h3>
        {question.description && (
          <p className="text-sm text-text-secondary">{question.description}</p>
        )}
      </div>

      {/* AI Recommendation */}
      {showRecommendation && recommendation && recommendedOption && (
        <RecommendationBadge
          recommendation={recommendation}
          onAccept={() => {
            onAnswer(recommendedOption.id);
            setAnswer(null);
          }}
        />
      )}

      {/* Answer input based on question type */}
      <div className="space-y-4">
        {question.questionType === 'single_choice' && question.options && (
          <OptionList
            options={question.options}
            {...(typeof answer === 'string' || Array.isArray(answer) ? { selected: answer } : {})}
            mode="single"
            onSelect={handleOptionSelect}
            {...(onImpactPreview && { onHoverOption: onImpactPreview })}
            disabled={disabled}
          />
        )}

        {question.questionType === 'multiple_choice' && question.options && (
          <>
            <OptionList
              options={question.options}
              {...(typeof answer === 'string' || Array.isArray(answer) ? { selected: answer } : {})}
              mode="multiple"
              onSelect={(selected) => setAnswer(selected)}
              {...(onImpactPreview && { onHoverOption: onImpactPreview })}
              disabled={disabled}
            />
            {answer && Array.isArray(answer) && answer.length > 0 && (
              <button
                onClick={handleSubmitMultiple}
                disabled={disabled}
                className="w-full rounded-lg bg-accent-primary px-4 py-2 font-semibold text-white hover:bg-accent-primary-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit Selection ({answer.length})
              </button>
            )}
          </>
        )}

        {question.questionType === 'text' && (
          <TextInput
            value={typeof answer === 'string' ? answer : ''}
            onChange={setAnswer}
            onSubmit={handleAnswer}
            placeholder="Enter your answer..."
            multiline={true}
            disabled={disabled}
          />
        )}

        {question.questionType === 'code' && (
          <CodeInput
            value={typeof answer === 'string' ? answer : ''}
            onChange={setAnswer}
            language="javascript"
            disabled={disabled}
          />
        )}

        {question.questionType === 'number' && (
          <input
            type="number"
            value={typeof answer === 'number' ? answer : ''}
            onChange={(e) => setAnswer(e.target.value ? parseInt(e.target.value) : null)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
            placeholder="Enter a number..."
            disabled={disabled}
            className="w-full rounded-lg border border-border-default bg-bg-secondary px-4 py-2 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
          />
        )}
      </div>

      {/* Explainer */}
      {showExplainer && question.whyAsking ? (
        <Explainer
          explainer={{ whyAsking: question.whyAsking }}
          expanded={!!expandedExplainer}
          onToggle={() => setExpandedExplainer(!expandedExplainer)}
        />
      ) : null}

      {/* Action buttons */}
      <div className="flex gap-2">
        {(question.questionType === 'text' ||
          question.questionType === 'number' ||
          question.questionType === 'code') && (
          <button
            onClick={handleAnswer}
            disabled={disabled || answer === null || (typeof answer === 'string' && answer === '') || answer === false}
            className="flex-1 rounded-lg bg-accent-primary px-4 py-2 font-semibold text-white hover:bg-accent-primary-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
        )}

        {onSkip && (
          <button
            onClick={onSkip}
            disabled={disabled}
            className="rounded-lg border border-border-default px-4 py-2 font-semibold text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip (S)
          </button>
        )}
      </div>

      {/* Keyboard hints */}
      {showKeyboardHints && (
        <KeyboardHints
          questionType={question.questionType}
          optionCount={answerOptionsCount}
          showSkip={!!onSkip}
          showExplainer={!!question.whyAsking}
          compact={true}
          visible={true}
        />
      )}
    </div>
  );
}
