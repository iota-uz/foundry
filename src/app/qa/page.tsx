'use client';

/**
 * Q&A Page - Interactive workflow Q&A interface
 * Connects to SSE stream for real-time question updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { QAPanel } from '@/components/qa/qa-panel';
import type { AIQuestion, QuestionBatch, Answer } from '@/types/ai';

export default function QAPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId');

  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(null);
  const [currentBatch, setCurrentBatch] = useState<QuestionBatch | null>(null);
  const [, setAnswers] = useState<Answer[]>([]);
  const [phase] = useState<'cpo' | 'clarify' | 'cto' | null>(null);
  const [topic] = useState<string | null>(null);
  const [progress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream
  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    console.log('Connecting to SSE stream for session:', sessionId);

    const eventSource = new EventSource(`/api/workflow/stream?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setConnected(true);
      setError(null);
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setConnected(false);
      setError('Connection lost. Attempting to reconnect...');
    };

    // Listen for specific event types
    eventSource.addEventListener('question', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Received question event:', data);

      if (data.question) {
        setCurrentQuestion(data.question);
        setCurrentBatch(null);
      }
    });

    eventSource.addEventListener('question_batch', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Received question batch event:', data);

      if (data.batch) {
        setCurrentBatch(data.batch);
        setCurrentQuestion(null);
      }
    });

    eventSource.addEventListener('progress', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Progress update:', data);

      if (data.message) {
        console.log('Progress message:', data.message);
      }
    });

    eventSource.addEventListener('step_start', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Step started:', data.stepId);
    });

    eventSource.addEventListener('step_complete', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Step completed:', data.stepId);
    });

    eventSource.addEventListener('complete', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Workflow complete:', data);

      // Navigate back to dashboard or show summary
      setTimeout(() => {
        router.push('/');
      }, 2000);
    });

    eventSource.addEventListener('error', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.error('Workflow error:', data.message);
      setError(data.message || 'An error occurred');
    });

    // Cleanup on unmount
    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [sessionId, router]);

  const handleAnswer = useCallback(async (questionId: string, answer: unknown) => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/workflow/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          questionId,
          answer,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      // Add to answers list
      setAnswers(prev => [
        ...prev,
        {
          questionId,
          value: answer,
          skipped: false,
          answeredAt: new Date().toISOString(),
        },
      ]);

      // Clear current question (new one will come via SSE)
      setCurrentQuestion(null);
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
    }
  }, [sessionId]);

  const handleSkip = useCallback(async (questionId: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/workflow/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          questionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to skip question');
      }

      // Add to answers list as skipped
      setAnswers(prev => [
        ...prev,
        {
          questionId,
          value: null,
          skipped: true,
          answeredAt: new Date().toISOString(),
        },
      ]);

      // Clear current question
      setCurrentQuestion(null);
    } catch (error) {
      console.error('Error skipping question:', error);
      setError('Failed to skip question. Please try again.');
    }
  }, [sessionId]);

  if (!sessionId) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-default bg-bg-secondary px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {phase ? `${phase.toUpperCase()} Phase` : 'Workflow Q&A'}
            </h1>
            {topic && (
              <p className="text-sm text-text-secondary">
                Topic: {topic}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-text-secondary">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Progress */}
            {progress.total > 0 && (
              <div className="text-sm text-text-secondary">
                Question {progress.current} of {progress.total}
              </div>
            )}

            {/* Cancel button */}
            <button
              onClick={() => router.push('/')}
              className="rounded-md border border-border-default px-4 py-2 text-sm text-text-primary transition-colors hover:bg-bg-tertiary"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-4 rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden p-6">
        {currentQuestion || currentBatch ? (
          <QAPanel
            question={currentQuestion}
            batch={currentBatch}
            onAnswer={handleAnswer}
            onSkip={handleSkip}
            title={phase ? `${phase.toUpperCase()} Phase Q&A` : 'Workflow Q&A'}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
              <p className="text-text-secondary">
                {connected ? 'Waiting for questions...' : 'Connecting...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
