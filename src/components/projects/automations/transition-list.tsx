/**
 * Transition List Component
 *
 * List of transition rules for an automation.
 * Features:
 * - Visual flow diagram style
 * - Add/edit/delete transitions
 * - Inline editing
 */

'use client';

import React, { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { TransitionEditor } from './transition-editor';
import type { Transition, CreateTransitionData, UpdateTransitionData } from '@/store/automation.store';

// ============================================================================
// Types
// ============================================================================

interface TransitionListProps {
  transitions: Transition[];
  availableStatuses: string[];
  onAdd: (data: CreateTransitionData) => Promise<void>;
  onUpdate: (id: string, data: UpdateTransitionData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSaving: boolean;
}

// ============================================================================
// Transition Row
// ============================================================================

function TransitionRow({
  transition,
  onEdit,
  onDelete,
  isDeleting,
}: {
  transition: Transition;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const conditionColors = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    failure: 'bg-red-500/10 text-red-400 border-red-500/30',
    custom: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  return (
    <div
      className={`
        group flex items-center gap-3 p-3
        bg-bg-tertiary/50 border border-border-subtle rounded-lg
        hover:border-border-default
        transition-all duration-150
      `}
    >
      {/* Condition badge */}
      <div
        className={`
          px-2.5 py-1 rounded-md border text-xs font-mono font-medium
          ${conditionColors[transition.condition]}
        `}
      >
        {transition.condition}
        {transition.condition === 'custom' && transition.customExpression !== undefined && transition.customExpression !== '' && (
          <span className="ml-1.5 opacity-70">(...)</span>
        )}
      </div>

      {/* Arrow */}
      <ChevronRightIcon className="w-4 h-4 text-text-muted flex-shrink-0" />

      {/* Next status */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs font-mono text-text-tertiary">move to:</span>
        <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-default text-sm font-mono text-text-primary">
          {transition.nextStatus}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1.5 rounded-md text-text-tertiary hover:text-accent-error hover:bg-accent-error/10 transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <TrashIcon className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function TransitionList({
  transitions,
  availableStatuses,
  onAdd,
  onUpdate,
  onDelete,
  isSaving,
}: TransitionListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New transition form state
  const [newCondition, setNewCondition] = useState<'success' | 'failure' | 'custom'>('success');
  const [newExpression, setNewExpression] = useState('');
  const [newNextStatus, setNewNextStatus] = useState('');

  // Edit form state
  const [editCondition, setEditCondition] = useState<'success' | 'failure' | 'custom'>('success');
  const [editExpression, setEditExpression] = useState('');
  const [editNextStatus, setEditNextStatus] = useState('');

  const handleStartEdit = (transition: Transition) => {
    setEditingId(transition.id);
    setEditCondition(transition.condition);
    setEditExpression(transition.customExpression ?? '');
    setEditNextStatus(transition.nextStatus);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCondition('success');
    setEditExpression('');
    setEditNextStatus('');
  };

  const handleSaveEdit = async () => {
    if (editingId === null || editingId === '') return;

    await onUpdate(editingId, {
      condition: editCondition,
      customExpression: editCondition === 'custom' ? editExpression : null,
      nextStatus: editNextStatus,
    });

    handleCancelEdit();
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewCondition('success');
    setNewExpression('');
    setNewNextStatus('');
  };

  const handleSaveAdd = async () => {
    await onAdd({
      condition: newCondition,
      customExpression: newCondition === 'custom' ? newExpression : undefined,
      nextStatus: newNextStatus,
    });

    handleCancelAdd();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-text-primary">
          Status Transitions
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className={`
              inline-flex items-center gap-1.5
              px-2.5 py-1 rounded-md
              text-xs font-medium
              text-emerald-400 hover:bg-emerald-500/10
              transition-colors
            `}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Transition
          </button>
        )}
      </div>

      {/* Flow visualization header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-bg-tertiary/30 rounded-lg text-[10px] font-mono text-text-muted uppercase tracking-wider">
        <span className="w-20">Condition</span>
        <span className="w-4" />
        <span className="flex-1">Next Status</span>
      </div>

      {/* Transition list */}
      {transitions.length === 0 && !isAdding && (
        <div className="py-8 text-center">
          <div className="text-sm text-text-tertiary mb-2">No transitions configured</div>
          <p className="text-xs text-text-muted">
            Add transitions to move issues based on workflow results
          </p>
        </div>
      )}

      <div className="space-y-2">
        {transitions.map((transition) =>
          editingId === transition.id ? (
            <TransitionEditor
              key={transition.id}
              condition={editCondition}
              customExpression={editExpression}
              nextStatus={editNextStatus}
              availableStatuses={availableStatuses}
              onConditionChange={setEditCondition}
              onCustomExpressionChange={setEditExpression}
              onNextStatusChange={setEditNextStatus}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              isSaving={isSaving}
            />
          ) : (
            <TransitionRow
              key={transition.id}
              transition={transition}
              onEdit={() => handleStartEdit(transition)}
              onDelete={() => handleDelete(transition.id)}
              isDeleting={deletingId === transition.id}
            />
          )
        )}

        {/* Add new transition form */}
        {isAdding && (
          <TransitionEditor
            condition={newCondition}
            customExpression={newExpression}
            nextStatus={newNextStatus}
            availableStatuses={availableStatuses}
            onConditionChange={setNewCondition}
            onCustomExpressionChange={setNewExpression}
            onNextStatusChange={setNewNextStatus}
            onSave={handleSaveAdd}
            onCancel={handleCancelAdd}
            isSaving={isSaving}
          />
        )}
      </div>

      {/* Help text */}
      <div className="p-3 rounded-lg bg-bg-tertiary/30 border border-border-subtle">
        <p className="text-xs text-text-tertiary">
          <span className="text-emerald-400 font-mono">success</span> = workflow completed successfully,{' '}
          <span className="text-red-400 font-mono">failure</span> = workflow failed,{' '}
          <span className="text-purple-400 font-mono">custom</span> = evaluate expression
        </p>
      </div>
    </div>
  );
}
