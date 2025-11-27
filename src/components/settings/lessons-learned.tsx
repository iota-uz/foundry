'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shared';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export interface Lesson {
  id: string;
  date: string;
  title: string;
  context: string;
  error: string;
  fix: string;
  rule: string;
  addedBy: 'ai' | 'user';
}

interface LessonFormData {
  date: string;
  title: string;
  context: string;
  error: string;
  fix: string;
  rule: string;
  addedBy: 'ai' | 'user';
}

interface LessonFormState {
  isOpen: boolean;
  formData: LessonFormData;
}

export function LessonsLearned() {
  const [lessons, setLessons] = useState<Lesson[]>([
    {
      id: '1',
      date: '2025-01-15',
      title: 'API Error Format',
      context: 'Generating login endpoint response',
      error: 'Generated endpoint returned {error: "message"}',
      fix: 'Changed to {code: "ERR_001", message: "...", details: {...}}',
      rule: 'All errors must follow ErrorResponse schema from constitution',
      addedBy: 'ai',
    },
    {
      id: '2',
      date: '2025-01-14',
      title: 'Database Naming Convention',
      context: 'Creating users table',
      error: 'Created table Users (PascalCase)',
      fix: 'Renamed to users (snake_case, singular)',
      rule: 'All database tables use snake_case singular form',
      addedBy: 'ai',
    },
    {
      id: '3',
      date: '2025-01-12',
      title: 'Missing Input Validation',
      context: 'User registration endpoint',
      error: 'No email format validation',
      fix: 'Added email regex validation at API boundary',
      rule: 'All user input must be validated before processing',
      addedBy: 'user',
    },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const getDefaultFormData = (): LessonFormData => ({
    date: new Date().toISOString().split('T')[0] ?? '',
    title: '',
    context: '',
    error: '',
    fix: '',
    rule: '',
    addedBy: 'user',
  });

  const [formState, setFormState] = useState<LessonFormState>({
    isOpen: false,
    formData: getDefaultFormData(),
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleAddLesson = async () => {
    try {
      setIsSaving(true);

      if (
        !formState.formData.title ||
        !formState.formData.context ||
        !formState.formData.error ||
        !formState.formData.fix ||
        !formState.formData.rule
      ) {
        alert('Please fill in all fields');
        return;
      }

      const newLesson: Lesson = {
        id: Date.now().toString(),
        date: formState.formData.date,
        title: formState.formData.title,
        context: formState.formData.context,
        error: formState.formData.error,
        fix: formState.formData.fix,
        rule: formState.formData.rule,
        addedBy: formState.formData.addedBy,
      };

      setLessons((prev) => [newLesson, ...prev]);

      // In a real implementation, this would call an API
      // await fetch('/api/lessons', {
      //   method: 'POST',
      //   body: JSON.stringify(newLesson),
      // });

      setFormState({
        isOpen: false,
        formData: getDefaultFormData(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLesson = (id: string): void => {
    if (confirm('Delete this lesson?')) {
      setLessons((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handleExport = (): void => {
    const data = JSON.stringify(lessons, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lessons-learned.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedLessons = [...lessons].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Lessons Learned
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            {lessons.length} {lessons.length === 1 ? 'entry' : 'entries'} • Last
            updated: {lessons.length > 0 ? 'Today' : 'Never'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="secondary"
            size="sm"
            disabled={lessons.length === 0}
          >
            Export
          </Button>
          <Button
            onClick={() => setFormState((prev) => ({ ...prev, isOpen: true }))}
            variant="primary"
            size="sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Add new lesson form */}
      {formState.isOpen && (
        <div className="p-6 bg-bg-secondary border border-border-default rounded-lg space-y-4">
          <h4 className="font-semibold text-text-primary">New Lesson</h4>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={formState.formData.title || ''}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  formData: { ...prev.formData, title: e.target.value },
                }))
              }
              placeholder="Brief title of the lesson"
              className="w-full px-3 py-2 bg-bg-secondary text-text-primary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Context *
            </label>
            <input
              type="text"
              value={formState.formData.context || ''}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  formData: { ...prev.formData, context: e.target.value },
                }))
              }
              placeholder="When did this happen?"
              className="w-full px-3 py-2 bg-bg-secondary text-text-primary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Error *
            </label>
            <textarea
              value={formState.formData.error || ''}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  formData: { ...prev.formData, error: e.target.value },
                }))
              }
              placeholder="What was the error or problem?"
              className="w-full px-3 py-2 bg-bg-secondary text-text-primary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Fix *
            </label>
            <textarea
              value={formState.formData.fix || ''}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  formData: { ...prev.formData, fix: e.target.value },
                }))
              }
              placeholder="How was it fixed?"
              className="w-full px-3 py-2 bg-bg-secondary text-text-primary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Generalized Rule *
            </label>
            <textarea
              value={formState.formData.rule || ''}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  formData: { ...prev.formData, rule: e.target.value },
                }))
              }
              placeholder="General principle to avoid this in the future"
              className="w-full px-3 py-2 bg-bg-secondary text-text-primary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none h-24"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() =>
                setFormState({
                  isOpen: false,
                  formData: getDefaultFormData(),
                })
              }
              variant="ghost"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLesson}
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Add Lesson'}
            </Button>
          </div>
        </div>
      )}

      {/* Lessons list */}
      <div className="space-y-3">
        {sortedLessons.length === 0 ? (
          <div className="p-6 text-center bg-bg-secondary border border-border-default rounded-lg">
            <p className="text-text-secondary">No lessons learned yet</p>
            <p className="text-sm text-text-tertiary mt-1">
              Lessons will be added as you build your specifications
            </p>
          </div>
        ) : (
          sortedLessons.map((lesson) => (
            <div
              key={lesson.id}
              className="border border-border-default rounded-lg overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === lesson.id ? null : lesson.id)
                }
                className="w-full p-4 bg-bg-secondary hover:bg-bg-tertiary transition-colors text-left flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-tertiary">
                      {new Date(lesson.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                      :
                    </span>
                    <span className="font-semibold text-text-primary">
                      {lesson.title}
                    </span>
                    {lesson.addedBy === 'ai' && (
                      <span className="px-2 py-0.5 bg-accent-primary/10 text-accent-primary text-xs rounded">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {lesson.rule}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLesson(lesson.id);
                    }}
                    className="p-1 hover:bg-accent-error/10 rounded transition-colors"
                  >
                    <TrashIcon className="h-4 w-4 text-text-secondary hover:text-accent-error" />
                  </button>
                  {expandedId === lesson.id ? (
                    <ChevronUpIcon className="h-5 w-5 text-text-secondary" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-text-secondary" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {expandedId === lesson.id && (
                <div className="px-4 py-4 bg-bg-tertiary border-t border-border-default space-y-4">
                  <div>
                    <h5 className="text-sm font-semibold text-text-primary mb-1">
                      Context
                    </h5>
                    <p className="text-sm text-text-secondary">
                      {lesson.context}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-text-primary mb-1">
                      Error
                    </h5>
                    <p className="text-sm text-accent-error bg-accent-error/10 p-2 rounded">
                      {lesson.error}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-text-primary mb-1">
                      Fix
                    </h5>
                    <p className="text-sm text-accent-success bg-accent-success/10 p-2 rounded">
                      {lesson.fix}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-text-primary mb-1">
                      Rule
                    </h5>
                    <p className="text-sm text-text-secondary italic">
                      {lesson.rule}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
