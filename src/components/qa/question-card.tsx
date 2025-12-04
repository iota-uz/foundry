'use client';

/**
 * Question Card Component
 *
 * Displays a single question with answer options and actions.
 * Integrates multiple F14-F20 features.
 */

import { useState, useCallback, useMemo } from 'react';
import type { AIQuestion } from '@/types/ai';
import { OptionList } from './option-list';
import { TextInput } from './text-input';
import { CodeInput } from './code-input';
import { ColorPicker } from './color-picker';
import { RecommendationBadge } from './recommendation-badge';
import { KeyboardHints } from './keyboard-hints';
import { Explainer } from './explainer';

interface QuestionCardProps {
  question: AIQuestion;
  onAnswer: (answer: unknown) => void;
  onSkip?: (() => void) | undefined;
  disabled?: boolean | undefined;
  showRecommendation?: boolean | undefined;
  showExplainer?: boolean | undefined;
  showKeyboardHints?: boolean | undefined;
  onImpactPreview?: ((optionId: string | null) => void) | undefined;
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
    question.explainer && (question.questionType === 'text' || question.questionType === 'code')
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

  const answerOptionsCount = useMemo(() => {
    return question.options?.length || 0;
  }, [question.options]);

  return (
    <div className="w-full space-y-4 rounded-lg border border-gray-700 bg-gray-800/40 p-6">
      {/* Question header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">{question.question}</h3>
        {question.description && (
          <p className="text-sm text-gray-400">{question.description}</p>
        )}
      </div>

      {/* AI Recommendation (F16) */}
      {showRecommendation && question.recommendation && (
        <RecommendationBadge
          recommendation={question.recommendation}
          onAccept={() => {
            onAnswer(question.recommendation!.recommendedOptionId);
            setAnswer(null);
          }}
        />
      )}

      {/* Answer input based on question type */}
      <div className="space-y-4">
        {question.questionType === 'single_choice' && question.options && (
          <OptionList
            options={question.options}
            selected={answer}
            mode="single"
            onSelect={handleOptionSelect}
            onHoverOption={onImpactPreview}
            disabled={disabled}
          />
        )}

        {question.questionType === 'multiple_choice' && question.options && (
          <>
            <OptionList
              options={question.options}
              selected={answer}
              mode="multiple"
              onSelect={(selected) => setAnswer(selected)}
              onHoverOption={onImpactPreview}
              disabled={disabled}
            />
            {answer && Array.isArray(answer) && answer.length > 0 && (
              <button
                onClick={handleSubmitMultiple}
                disabled={disabled}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit Selection ({answer.length})
              </button>
            )}
          </>
        )}

        {question.questionType === 'text' && (
          <TextInput
            value={answer || ''}
            onChange={setAnswer}
            onSubmit={handleAnswer}
            placeholder="Enter your answer..."
            validation={question.validation}
            multiline={true}
            disabled={disabled}
          />
        )}

        {question.questionType === 'code' && (
          <CodeInput
            value={answer || ''}
            onChange={setAnswer}
            language="javascript"
            disabled={disabled}
          />
        )}

        {question.questionType === 'color' && (
          <ColorPicker
            value={answer || '#3b82f6'}
            onChange={setAnswer}
            disabled={disabled}
          />
        )}

        {question.questionType === 'number' && (
          <input
            type="number"
            value={answer ?? ''}
            onChange={(e) => setAnswer(e.target.value ? parseInt(e.target.value) : null)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
            placeholder="Enter a number..."
            disabled={disabled}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-600 focus:outline-none"
          />
        )}

        {question.questionType === 'date' && (
          <input
            type="date"
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-600 focus:outline-none"
          />
        )}
      </div>

      {/* Explainer (F19) */}
      {showExplainer && question.explainer && (
        <Explainer
          explainer={question.explainer}
          expanded={expandedExplainer}
          onToggle={() => setExpandedExplainer(!expandedExplainer)}
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {(question.questionType === 'text' ||
          question.questionType === 'number' ||
          question.questionType === 'date' ||
          question.questionType === 'code' ||
          question.questionType === 'color') && (
          <button
            onClick={handleAnswer}
            disabled={disabled || answer === null || answer === ''}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
        )}

        {onSkip && (
          <button
            onClick={onSkip}
            disabled={disabled}
            className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip (S)
          </button>
        )}
      </div>

      {/* Keyboard hints (F20) */}
      {showKeyboardHints && (
        <KeyboardHints
          questionType={question.questionType}
          optionCount={answerOptionsCount}
          showSkip={!!onSkip}
          showExplainer={!!question.explainer}
          showRecommendation={!!question.recommendation}
          compact={true}
          visible={true}
        />
      )}
    </div>
  );
}
