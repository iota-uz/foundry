'use client';

/**
 * Q&A Panel Component
 *
 * Main container for Q&A interface with cognitive load reduction features.
 * Updated for current design system with modern minimal dark theme.
 * Simplified for MVP - keeping core functionality.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  QuestionBatch,
  AIQuestion,
} from '@/lib/planning/types';
import { QuestionBatch as QuestionBatchComponent } from './question-batch';
import { QuestionCard } from './question-card';
import { LivePreview } from './live-preview';
import { DecisionJournal } from './decision-journal';

interface SpecUpdate {
  id: string;
  type: 'add' | 'modify' | 'remove';
  section: string;
  path: string;
  newValue?: unknown;
  timestamp: string;
  artifactType: 'schema' | 'api' | 'component' | 'feature';
}

interface DecisionEntry {
  id: string;
  questionText: string;
  answerGiven: unknown;
  category: string;
  phase: string;
  createdAt: string;
}

interface QAPanelConfig {
  showBatchProgress?: boolean;
  showLivePreview?: boolean;
  showRecommendations?: boolean;
  showDecisionJournal?: boolean;
  showExplainers?: boolean;
  enableKeyboardShortcuts?: boolean;
}

interface QAPanelProps {
  question?: AIQuestion | null;
  batch?: QuestionBatch | null;
  specUpdates?: SpecUpdate[];
  decisionEntries?: DecisionEntry[];
  onAnswer: (questionId: string, answer: unknown) => void;
  onSkip?: (questionId: string) => void;
  onCompleteBatch?: () => void;
  disabled?: boolean;
  title?: string;
  config?: Partial<QAPanelConfig>;
}

const defaultConfig: QAPanelConfig = {
  showBatchProgress: true,
  showLivePreview: true,
  showRecommendations: true,
  showDecisionJournal: true,
  showExplainers: true,
  enableKeyboardShortcuts: true,
};

export function QAPanel({
  question,
  batch,
  specUpdates = [],
  decisionEntries = [],
  onAnswer,
  onSkip,
  onCompleteBatch,
  disabled = false,
  title = 'Q&A',
  config = {},
}: QAPanelProps) {
  const finalConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  const [livePreviewOpen, setLivePreviewOpen] = useState(finalConfig.showLivePreview || false);
  const [journalOpen, setJournalOpen] = useState(false);

  const handleAnswer = useCallback(
    (questionId: string, answer: unknown) => {
      onAnswer(questionId, answer);
    },
    [onAnswer]
  );

  const handleSkip = useCallback(
    (questionId: string) => {
      onSkip?.(questionId);
    },
    [onSkip]
  );

  const toggleLivePreview = useCallback(() => {
    setLivePreviewOpen((prev) => !prev);
  }, []);

  const toggleJournal = useCallback(() => {
    setJournalOpen((prev) => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!finalConfig.enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // S = Skip
      if (e.key?.toLowerCase() === 's' && (question || batch)) {
        e.preventDefault();
        const questionId = batch
          ? batch.questions[0]?.id
          : question?.id;
        if (questionId) {
          handleSkip(questionId);
        }
      }

      // Cmd+P = Toggle preview
      if (e.metaKey && e.key === 'p') {
        e.preventDefault();
        toggleLivePreview();
      }

      // Cmd+J = Toggle decision journal
      if (e.metaKey && e.key === 'j') {
        e.preventDefault();
        toggleJournal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, batch, finalConfig.enableKeyboardShortcuts, handleSkip, toggleLivePreview, toggleJournal]);

  const displayMode = batch ? 'batch' : 'single';

  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-border-default bg-bg-secondary p-6">
      {/* Header */}
      <div className="border-b border-border-default pb-4">
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        {batch && (
          <p className="mt-1 text-sm text-text-secondary">
            Phase: <span className="font-semibold">{batch.phase.toUpperCase()}</span>
          </p>
        )}
      </div>

      {/* Main content */}
      <div className={`flex flex-1 gap-4 overflow-hidden ${
        finalConfig.showLivePreview ? 'flex-row' : ''
      }`}>
        {/* Q&A section */}
        <div className={`flex flex-col gap-4 overflow-y-auto ${
          finalConfig.showLivePreview ? 'flex-1' : 'w-full'
        }`}>
          {displayMode === 'batch' && batch ? (
            <QuestionBatchComponent
              batch={batch}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
              {...(onCompleteBatch && { onCompleteBatch })}
              disabled={disabled}
              showProgress={finalConfig.showBatchProgress ?? true}
            />
          ) : question ? (
            <QuestionCard
              question={question}
              onAnswer={(answer) => handleAnswer(question.id, answer)}
              onSkip={() => handleSkip(question.id)}
              disabled={disabled}
              showRecommendation={finalConfig.showRecommendations ?? true}
              showExplainer={finalConfig.showExplainers ?? true}
              showKeyboardHints={finalConfig.enableKeyboardShortcuts ?? true}
            />
          ) : (
            <div className="rounded-lg border border-border-default bg-bg-tertiary p-6 text-center">
              <p className="text-text-tertiary">No questions available</p>
            </div>
          )}

          {/* Decision Journal */}
          {finalConfig.showDecisionJournal && decisionEntries.length > 0 && (
            <DecisionJournal
              entries={decisionEntries}
              isOpen={journalOpen}
              onToggle={toggleJournal}
              title="Decision Journal"
            />
          )}
        </div>

        {/* Right sidebar - Live Preview */}
        {finalConfig.showLivePreview && (
          <div className="flex flex-col gap-4 w-96 overflow-y-auto border-l border-border-default pl-4">
            <LivePreview
              updates={specUpdates}
              isOpen={livePreviewOpen}
              onToggle={toggleLivePreview}
              title="Live Preview"
            />
          </div>
        )}
      </div>

      {/* Keyboard hints footer */}
      {finalConfig.enableKeyboardShortcuts && (
        <div className="border-t border-border-default pt-3 text-xs text-text-tertiary">
          <span>Shortcuts: </span>
          <span className="text-text-secondary">
            S = Skip | Cmd+P = Preview | Cmd+J = Journal
          </span>
        </div>
      )}
    </div>
  );
}
