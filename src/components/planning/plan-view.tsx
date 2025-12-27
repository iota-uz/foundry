'use client';

/**
 * Plan View Component
 *
 * Main container for the issue planning interface with side-by-side layout.
 * Features:
 * - Q&A panel on the left
 * - Artifacts panel on the right
 * - Phase stepper header
 * - Status indicators and controls
 */

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';
import { usePlanningStore } from '@/store/planning.store';
import { Button } from '@/components/shared/button';
import { PhaseStepper } from './phase-stepper';
import { PlanArtifactsPanel } from './plan-artifacts-panel';
import { QAPanel } from './qa';
import type { SubmitAnswersRequest } from '@/lib/planning/types';

// ============================================================================
// Types
// ============================================================================

interface PlanViewProps {
  projectId: string;
  issueId: string;
  issueTitle: string;
  issueBody: string;
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status, connected }: { status: string; connected: boolean }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: 'text-text-tertiary' },
    requirements: { label: 'Requirements', color: 'text-accent-primary' },
    clarify: { label: 'Clarifying', color: 'text-amber-400' },
    technical: { label: 'Technical', color: 'text-purple-400' },
    completed: { label: 'Completed', color: 'text-accent-success' },
    failed: { label: 'Failed', color: 'text-accent-error' },
  };

  const config = statusConfig[status] ?? { label: 'Not Started', color: 'text-text-tertiary' };

  return (
    <div className="flex items-center gap-3">
      {/* Connection indicator */}
      <div className="flex items-center gap-1.5">
        {connected ? (
          <>
            <SignalIcon className="w-4 h-4 text-accent-success" />
            <span className="text-xs text-accent-success">Connected</span>
          </>
        ) : (
          <>
            <SignalSlashIcon className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">Disconnected</span>
          </>
        )}
      </div>

      <div className="w-px h-4 bg-border-default" />

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            status === 'completed'
              ? 'bg-accent-success'
              : status === 'failed'
                ? 'bg-accent-error'
                : status === 'not_started'
                  ? 'bg-text-tertiary'
                  : 'bg-accent-primary animate-pulse'
          }`}
        />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PlanView({ projectId, issueId, issueTitle, issueBody }: PlanViewProps) {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    status,
    connected,
    currentBatch,
    isLoading,
    isSubmitting,
    error,
    startPlanning,
    loadExistingPlan,
    submitAnswers,
    pausePlanning,
    resumePlanning,
    cancelPlanning,
    clearError,
    reset,
  } = usePlanningStore();

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      // First try to load existing plan
      await loadExistingPlan(projectId, issueId);
      setIsInitialized(true);
    };
    void init();

    // Cleanup on unmount
    return () => {
      reset();
    };
  }, [projectId, issueId, loadExistingPlan, reset]);

  // Start planning if no existing plan
  const handleStartPlanning = useCallback(async () => {
    await startPlanning(projectId, issueId, issueTitle, issueBody);
  }, [projectId, issueId, issueTitle, issueBody, startPlanning]);

  // Handle answer submission
  const handleAnswer = useCallback(
    (questionId: string, answer: unknown) => {
      // For now, we'll collect answers and submit when the batch is complete
      // This could be enhanced to auto-submit after each answer
      console.log('Answer received:', questionId, answer);
    },
    []
  );

  // Handle batch completion
  const handleCompleteBatch = useCallback(async () => {
    if (!currentBatch) return;

    // Collect all answers from the form
    // In a real implementation, we'd use form state here
    const answers: SubmitAnswersRequest['answers'] = currentBatch.questions.map((q) => ({
      questionId: q.id,
      value: '', // This would come from form state
    }));

    await submitAnswers(answers);
  }, [currentBatch, submitAnswers]);

  // Navigate back
  const handleBack = useCallback(() => {
    router.push(`/projects/${projectId}/board`);
  }, [router, projectId]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    await cancelPlanning();
    handleBack();
  }, [cancelPlanning, handleBack]);

  const isActive = status !== 'not_started' && status !== 'completed' && status !== 'failed';
  const canStart = status === 'not_started' && !isLoading;
  const canPause = isActive && !isLoading;
  const canResume = status !== 'not_started' && !isActive && status !== 'completed' && status !== 'failed';

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Loading planning session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-border-default bg-bg-secondary">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            title="Back to board"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-text-primary truncate max-w-md">
              {issueTitle}
            </h1>
            <span className="text-xs text-text-tertiary">Planning Session</span>
          </div>
        </div>

        {/* Center - Phase Stepper */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <PhaseStepper />
        </div>

        {/* Right side - Status and Controls */}
        <div className="flex items-center gap-4">
          <StatusBadge status={status} connected={connected} />

          <div className="flex items-center gap-2">
            {canStart && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartPlanning}
                loading={isLoading}
                icon={<PlayIcon className="w-4 h-4" />}
              >
                Start Planning
              </Button>
            )}

            {canPause && (
              <Button
                variant="secondary"
                size="sm"
                onClick={pausePlanning}
                icon={<PauseIcon className="w-4 h-4" />}
              >
                Pause
              </Button>
            )}

            {canResume && (
              <Button
                variant="primary"
                size="sm"
                onClick={resumePlanning}
                icon={<PlayIcon className="w-4 h-4" />}
              >
                Resume
              </Button>
            )}

            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                icon={<XMarkIcon className="w-4 h-4" />}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2 bg-accent-error/10 border-b border-accent-error/30">
          <p className="text-sm text-accent-error">{error}</p>
          <button
            onClick={clearError}
            className="p-1 rounded hover:bg-accent-error/20 transition-colors"
          >
            <XMarkIcon className="w-4 h-4 text-accent-error" />
          </button>
        </div>
      )}

      {/* Main content - Side by side */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - Q&A */}
        <div className="flex-1 border-r border-border-default overflow-hidden">
          {status === 'not_started' ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-6">
                <span className="text-3xl">🎯</span>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Ready to Plan
              </h2>
              <p className="text-sm text-text-secondary max-w-md mb-6">
                Start the planning process to generate a comprehensive implementation plan for this issue.
                You&apos;ll answer questions in three phases: Requirements, Clarification, and Technical.
              </p>
              <Button
                variant="primary"
                onClick={handleStartPlanning}
                loading={isLoading}
                icon={<PlayIcon className="w-4 h-4" />}
              >
                Start Planning
              </Button>
            </div>
          ) : status === 'completed' ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-accent-success/20 flex items-center justify-center mb-6">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Planning Complete
              </h2>
              <p className="text-sm text-text-secondary max-w-md mb-6">
                All phases have been completed. View the generated artifacts in the panel on the right.
              </p>
              <Button variant="secondary" onClick={handleBack}>
                Return to Board
              </Button>
            </div>
          ) : status === 'failed' ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-accent-error/20 flex items-center justify-center mb-6">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Planning Failed
              </h2>
              <p className="text-sm text-text-secondary max-w-md mb-6">
                Something went wrong during the planning process. You can try starting again.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleBack}>
                  Return to Board
                </Button>
                <Button variant="primary" onClick={handleStartPlanning}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full p-4 overflow-y-auto">
              <QAPanel
                batch={currentBatch}
                onAnswer={handleAnswer}
                onCompleteBatch={handleCompleteBatch}
                disabled={isSubmitting}
                config={{
                  showBatchProgress: true,
                  showLivePreview: false, // We have a separate artifacts panel
                  showRecommendations: true,
                  showDecisionJournal: false,
                  showExplainers: true,
                  enableKeyboardShortcuts: true,
                }}
              />
            </div>
          )}
        </div>

        {/* Right panel - Artifacts */}
        <div className="w-[45%] min-w-[400px] max-w-[600px]">
          <PlanArtifactsPanel />
        </div>
      </div>
    </div>
  );
}
