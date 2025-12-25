'use client';

/**
 * Q&A Panel Component
 *
 * Main container for Q&A interface with all cognitive load reduction features.
 * Integrates F14-F20 features.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  QuestionBatch,
  AIQuestion,
  SpecUpdate,
  DecisionEntry,
  QAPanelState,
  QAPanelConfig,
} from '@/types/ai';
import { QuestionBatch as QuestionBatchComponent } from './question-batch';
import { QuestionCard } from './question-card';
import { LivePreview } from './live-preview';
import { DecisionJournal } from './decision-journal';
import { ImpactPopover } from './impact-preview';

interface QAPanelProps {
  question?: AIQuestion | null;
  batch?: QuestionBatch | null;
  specUpdates?: SpecUpdate[];
  decisionEntries?: DecisionEntry[];
  onAnswer: (questionId: string, answer: unknown) => void;
  onSkip?: (questionId: string) => void;
  onCompleteBatch?: () => void;
  onDecisionUndo?: (decisionId: string) => void;
  disabled?: boolean;
  title?: string;
  config?: Partial<QAPanelConfig>;
}

const defaultConfig: QAPanelConfig = {
  showBatchProgress: true,
  showLivePreview: true,
  showRecommendations: true,
  showDecisionJournal: true,
  showImpactPreviews: true,
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
  onDecisionUndo,
  disabled = false,
  title = 'Q&A',
  config = {},
}: QAPanelProps) {
  const finalConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  const [panelState, setPanelState] = useState<QAPanelState>({
    config: finalConfig,
    batch: batch ? {
      batchId: batch.batchId,
      currentQuestionIndex: 0,
      answeredCount: 0,
      totalQuestions: batch.questions.length,
      isComplete: false,
    } : null,
    livePreview: {
      isOpen: finalConfig.showLivePreview,
      position: 'right',
      diffMode: 'highlight',
      updates: specUpdates,
      pendingChanges: [],
    },
    decisionJournal: {
      entries: decisionEntries,
      currentIndex: decisionEntries.length - 1,
      filterPhase: 'all',
    },
    impactPopover: {
      isOpen: false,
      optionId: null,
      position: {},
      showDelay: 400,
      hideDelay: 200,
    },
    keyboard: {
      config: {
        context: 'global',
        enabled: {
          numberSelection: finalConfig.enableKeyboardShortcuts,
          yesNo: finalConfig.enableKeyboardShortcuts,
          submit: finalConfig.enableKeyboardShortcuts,
          skip: finalConfig.enableKeyboardShortcuts,
          explainer: finalConfig.enableKeyboardShortcuts,
          acceptRecommendation: finalConfig.enableKeyboardShortcuts,
          batchNavigation: finalConfig.enableKeyboardShortcuts,
        },
        showHints: finalConfig.enableKeyboardShortcuts,
      },
    },
    explainers: {},
  });

  // Update spec updates
  useEffect(() => {
    setPanelState((prev) => ({
      ...prev,
      livePreview: {
        ...prev.livePreview,
        updates: specUpdates,
      },
    }));
  }, [specUpdates]);

  // Update decision entries
  useEffect(() => {
    setPanelState((prev) => ({
      ...prev,
      decisionJournal: {
        ...prev.decisionJournal,
        entries: decisionEntries,
      },
    }));
  }, [decisionEntries]);

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

  const handleImpactPreview = useCallback(
    (optionId: string | null) => {
      setPanelState((prev) => ({
        ...prev,
        impactPopover: {
          ...prev.impactPopover,
          optionId,
          isOpen: optionId !== null,
        },
      }));
    },
    []
  );

  const toggleLivePreview = useCallback(() => {
    setPanelState((prev) => ({
      ...prev,
      livePreview: {
        ...prev.livePreview,
        isOpen: !prev.livePreview.isOpen,
      },
    }));
  }, []);

  const toggleDecisionJournal = useCallback(() => {
    setPanelState((prev) => ({
      ...prev,
      decisionJournal: {
        ...prev.decisionJournal,
        // Toggle by resetting entries if closed, keeping if open
      },
    }));
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

      // ? = Toggle explainer
      if (e.key === '?') {
        e.preventDefault();
        const questionId = batch
          ? batch.questions[0]?.id
          : question?.id;
        if (questionId) {
          setPanelState((prev) => ({
            ...prev,
            explainers: {
              ...prev.explainers,
              [questionId]: {
                isExpanded: !prev.explainers[questionId]?.isExpanded,
                defaultExpanded: prev.explainers[questionId]?.defaultExpanded ?? false,
              },
            },
          }));
        }
      }

      // Cmd+K, P = Toggle preview
      if (e.metaKey && e.key === 'p') {
        e.preventDefault();
        toggleLivePreview();
      }

      // Cmd+K, J = Toggle decision journal
      if (e.metaKey && e.key === 'j') {
        e.preventDefault();
        toggleDecisionJournal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, batch, finalConfig.enableKeyboardShortcuts, handleSkip, toggleLivePreview, toggleDecisionJournal, setPanelState]);

  const displayMode = batch ? 'batch' : 'single';

  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800/40 p-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {batch && (
          <p className="mt-1 text-sm text-gray-400">
            Phase: <span className="font-semibold">{batch.batchPosition.phase.toUpperCase()}</span>
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
              showProgress={finalConfig.showBatchProgress}
              showImpactPreviews={finalConfig.showImpactPreviews}
              onImpactPreview={handleImpactPreview}
            />
          ) : question ? (
            <QuestionCard
              question={question}
              onAnswer={(answer) => handleAnswer(question.id, answer)}
              onSkip={() => handleSkip(question.id)}
              disabled={disabled}
              showRecommendation={finalConfig.showRecommendations}
              showExplainer={finalConfig.showExplainers}
              showKeyboardHints={finalConfig.enableKeyboardShortcuts}
              {...(finalConfig.showImpactPreviews && { onImpactPreview: handleImpactPreview })}
            />
          ) : (
            <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-6 text-center">
              <p className="text-gray-400">No questions available</p>
            </div>
          )}

          {/* Decision Journal */}
          {finalConfig.showDecisionJournal && decisionEntries.length > 0 && (
            <DecisionJournal
              entries={decisionEntries}
              {...(onDecisionUndo && { onUndoTo: onDecisionUndo })}
              isOpen={false}
              title="Decision Journal"
            />
          )}
        </div>

        {/* Right sidebar - Live Preview & Impact */}
        {finalConfig.showLivePreview && (
          <div className="flex flex-col gap-4 w-96 overflow-y-auto border-l border-gray-700 pl-4">
            {/* Live Preview */}
            <LivePreview
              updates={panelState.livePreview.updates}
              diffMode={panelState.livePreview.diffMode}
              isOpen={panelState.livePreview.isOpen}
              onToggle={toggleLivePreview}
              title="Live Spec Preview"
            />

            {/* Impact Preview Popover */}
            {finalConfig.showImpactPreviews && panelState.impactPopover.isOpen && (
              <ImpactPopover
                impact={null} // Would be populated from option data
                visible={panelState.impactPopover.isOpen}
                position={panelState.impactPopover.position}
                onDismiss={() => handleImpactPreview(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Keyboard hints footer */}
      {finalConfig.enableKeyboardShortcuts && (
        <div className="border-t border-gray-700 pt-3 text-xs text-gray-500">
          <span>Shortcuts: </span>
          <span className="text-gray-400">
            S = Skip | ? = Explain | Cmd+P = Preview | Cmd+J = Journal
          </span>
        </div>
      )}
    </div>
  );
}
