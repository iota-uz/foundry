'use client';

/**
 * Question Batch Component
 *
 * Displays 2-5 related questions grouped by topic.
 * Updated for current design system with modern minimal dark theme.
 */

import { useState, useCallback, useMemo } from 'react';
import type { QuestionBatch } from '@/lib/planning/types';
import { QuestionCard } from './question-card';
import { ProgressIndicator } from './progress-indicator';

interface QuestionBatchProps {
  batch: QuestionBatch;
  onAnswer: (questionId: string, answer: unknown) => void;
  onSkip?: (questionId: string) => void;
  onSkipBatch?: () => void;
  onCompleteBatch?: () => void;
  disabled?: boolean;
  showProgress?: boolean;
  showImpactPreviews?: boolean;
  onImpactPreview?: (questionId: string, optionId: string | null) => void;
}

export function QuestionBatch({
  batch,
  onAnswer,
  onSkip,
  onSkipBatch,
  onCompleteBatch,
  disabled = false,
  showProgress = true,
  showImpactPreviews = true,
  onImpactPreview,
}: QuestionBatchProps) {
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const currentQuestion = useMemo(
    () => batch.questions[currentQuestionIndex] || null,
    [batch.questions, currentQuestionIndex]
  );

  const answeredCount = answeredQuestions.size;
  const totalQuestions = batch.questions.length;
  const isComplete = answeredCount === totalQuestions;

  const handleAnswer = useCallback(
    (answer: unknown) => {
      if (!currentQuestion) return;
      onAnswer(currentQuestion.id, answer);
      setAnsweredQuestions((prev) => new Set([...prev, currentQuestion.id]));

      // Move to next unanswered question
      let nextIndex = currentQuestionIndex + 1;
      while (nextIndex < batch.questions.length) {
        const nextQuestion = batch.questions[nextIndex];
        if (!nextQuestion || !answeredQuestions.has(nextQuestion.id)) {
          break;
        }
        nextIndex++;
      }

      if (nextIndex < batch.questions.length) {
        setCurrentQuestionIndex(nextIndex);
      }
    },
    [currentQuestion, onAnswer, currentQuestionIndex, batch.questions, answeredQuestions]
  );

  const handleSkip = useCallback(() => {
    if (!currentQuestion) return;
    if (onSkip) {
      onSkip(currentQuestion.id);
    }

    // Move to next unanswered question
    let nextIndex = currentQuestionIndex + 1;
    while (nextIndex < batch.questions.length) {
      const nextQuestion = batch.questions[nextIndex];
      if (!nextQuestion || !answeredQuestions.has(nextQuestion.id)) {
        break;
      }
      nextIndex++;
    }

    if (nextIndex < batch.questions.length) {
      setCurrentQuestionIndex(nextIndex);
    }
  }, [currentQuestion, onSkip, currentQuestionIndex, batch.questions, answeredQuestions]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < batch.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, batch.questions.length]);

  const handleCompleteBatch = useCallback(() => {
    if (isComplete && onCompleteBatch) {
      onCompleteBatch();
    }
  }, [isComplete, onCompleteBatch]);

  return (
    <div className="w-full space-y-6">
      {/* Batch header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text-primary">Batch {batch.batchNumber}</h2>
            <p className="text-sm text-text-secondary mt-1">
              Phase: <span className="font-semibold">{batch.phase.toUpperCase()}</span>
            </p>
          </div>
          <div className="flex-shrink-0 text-right text-sm">
            <div className="text-xs text-text-tertiary">
              ~{batch.estimatedTimeMinutes} min
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <ProgressIndicator
            current={answeredCount}
            total={totalQuestions}
            label={`Progress: ${answeredCount} of ${totalQuestions} answered`}
            size="md"
            variant={isComplete ? 'success' : 'default'}
            showPercentage={true}
          />
        )}
      </div>

      {/* Current question */}
      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
          disabled={disabled}
          showRecommendation={true}
          showExplainer={true}
          showKeyboardHints={true}
          {...(showImpactPreviews && onImpactPreview && {
            onImpactPreview: (optionId: string | null) => onImpactPreview(currentQuestion.id, optionId)
          })}
        />
      )}

      {/* Question navigation */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-tertiary p-4">
        <div className="flex gap-2">
          <button
            onClick={handlePrevious}
            disabled={disabled || currentQuestionIndex === 0}
            className="rounded-lg border border-border-default px-3 py-2 text-sm font-semibold text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Previous
          </button>
          <button
            onClick={handleNext}
            disabled={disabled || currentQuestionIndex === batch.questions.length - 1}
            className="rounded-lg border border-border-default px-3 py-2 text-sm font-semibold text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>

        <div className="text-sm text-text-tertiary">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>

        <div className="flex gap-2">
          {onSkipBatch && (
            <button
              onClick={onSkipBatch}
              disabled={disabled}
              className="rounded-lg border border-border-default px-3 py-2 text-sm font-semibold text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Skip Batch
            </button>
          )}

          {isComplete && onCompleteBatch && (
            <button
              onClick={handleCompleteBatch}
              className="rounded-lg bg-accent-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Complete Batch ✓
            </button>
          )}
        </div>
      </div>

      {/* Summary of answered questions */}
      {answeredCount > 0 && (
        <div className="rounded-lg border border-border-default bg-bg-tertiary p-4">
          <p className="text-sm font-semibold text-text-secondary mb-2">
            Answered Questions ({answeredCount}/{totalQuestions})
          </p>
          <div className="flex flex-wrap gap-2">
            {batch.questions.map((question, index) => (
              <button
                key={question.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-accent-primary text-white'
                    : answeredQuestions.has(question.id)
                    ? 'bg-accent-success-dim text-accent-success hover:opacity-80'
                    : 'bg-bg-elevated text-text-tertiary hover:bg-bg-hover'
                }`}
                disabled={disabled}
              >
                Q{index + 1}
                {answeredQuestions.has(question.id) && ' ✓'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
