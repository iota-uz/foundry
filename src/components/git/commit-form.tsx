'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/shared';

interface CommitFormProps {
  onCommit: (message: string) => Promise<void>;
  isLoading?: boolean;
  hasChanges?: boolean;
}

const MAX_COMMIT_LENGTH = 500;

export function CommitForm({
  onCommit,
  isLoading = false,
  hasChanges = true,
}: CommitFormProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messageLength = message.length;
  const isValid = messageLength > 0 && messageLength <= MAX_COMMIT_LENGTH;
  const isFull = messageLength >= MAX_COMMIT_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onCommit(message);
      setMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey === true || e.metaKey === true) && e.key === 'Enter') {
      if (isValid && !isSubmitting) {
        void handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        120
      ) + 'px';
    }
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your changes..."
          disabled={isLoading || isSubmitting || !hasChanges}
          className="
            w-full px-3 py-2
            bg-bg-secondary text-text-primary
            border border-border-default
            rounded-md
            focus:outline-none focus:ring-2 focus:ring-accent-primary
            placeholder:text-text-tertiary
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-none overflow-hidden
            transition-colors
          "
          rows={3}
        />

        {/* Character count */}
        <div
          className={`absolute bottom-2 right-2 text-xs font-medium ${
            isFull ? 'text-accent-error' : 'text-text-tertiary'
          }`}
        >
          {messageLength} / {MAX_COMMIT_LENGTH}
        </div>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>Press Ctrl+Enter to commit</span>
        {messageLength > 0 && (
          <span className={isFull ? 'text-accent-error' : ''}>
            {MAX_COMMIT_LENGTH - messageLength} characters left
          </span>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="sm"
        disabled={!isValid || isSubmitting || isLoading || !hasChanges}
        className="w-full"
      >
        {isSubmitting ? 'Committing...' : 'Commit'}
      </Button>
    </form>
  );
}
