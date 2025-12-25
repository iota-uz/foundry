'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shared';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import type { ChecklistItem } from '@/types';

interface ChecklistProps {
  items: ChecklistItem[];
  percentComplete: number;
  onUpdateItem?: (itemId: string, verified: boolean, notes?: string) => Promise<void>;
  onExport?: () => Promise<void>;
}

export function Checklist({
  items,
  percentComplete,
  onUpdateItem,
  onExport,
}: ChecklistProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleVerify = async (itemId: string, verified: boolean) => {
    if (!onUpdateItem) return;
    setUpdatingItemId(itemId);
    try {
      const item = items.find((i) => i.id === itemId);
      await onUpdateItem(itemId, verified, item?.notes);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleSaveNotes = async (itemId: string) => {
    if (!onUpdateItem) return;
    setUpdatingItemId(itemId);
    try {
      await onUpdateItem(itemId, true, editingNotes);
      setEditingItemId(null);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleExport = async () => {
    if (!onExport) return;
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Acceptance Criteria Checklist
        </h3>
        <p className="text-text-secondary">
          No checklist items yet. They are auto-generated from acceptance criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          Acceptance Criteria Checklist
        </h3>
        {onExport && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
          >
            Export to Markdown
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Verified</span>
          <span className="text-sm text-text-secondary">
            {items.filter((i) => i.verified).length}/{items.length} ({percentComplete}%)
          </span>
        </div>
        <div className="w-full bg-bg-tertiary rounded-full h-2">
          <div
            className="h-full rounded-full bg-accent-success transition-all"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item) => (
          <ChecklistItemComponent
            key={item.id}
            item={item}
            isExpanded={expandedItemId === item.id}
            isEditing={editingItemId === item.id}
            editingNotes={editingNotes}
            isUpdating={updatingItemId === item.id}
            onToggleExpand={() =>
              setExpandedItemId(
                expandedItemId === item.id ? null : item.id
              )
            }
            onToggleVerify={() => handleVerify(item.id, !item.verified)}
            onEditNotes={() => {
              setEditingItemId(item.id);
              setEditingNotes(item.notes || '');
            }}
            onSaveNotes={() => handleSaveNotes(item.id)}
            onCancelEdit={() => setEditingItemId(null)}
            onNotesChange={setEditingNotes}
          />
        ))}
      </div>
    </div>
  );
}

function ChecklistItemComponent({
  item,
  isExpanded,
  isEditing,
  editingNotes,
  isUpdating,
  onToggleExpand,
  onToggleVerify,
  onEditNotes,
  onSaveNotes,
  onCancelEdit,
  onNotesChange,
}: {
  item: ChecklistItem;
  isExpanded: boolean;
  isEditing: boolean;
  editingNotes: string;
  isUpdating: boolean;
  onToggleExpand: () => void;
  onToggleVerify: () => void;
  onEditNotes: () => void;
  onSaveNotes: () => void;
  onCancelEdit: () => void;
  onNotesChange: (notes: string) => void;
}) {
  return (
    <div className="border border-border-default rounded-lg p-3 hover:bg-bg-tertiary transition-colors">
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleVerify}
          disabled={isUpdating}
          className="flex-shrink-0 pt-0.5 text-text-secondary hover:text-accent-success disabled:opacity-50"
          title={item.verified ? 'Mark as unverified' : 'Mark as verified'}
        >
          {item.verified ? (
            <CheckCircleIcon className="h-5 w-5 text-accent-success" />
          ) : (
            <div className="h-5 w-5 rounded-full border border-text-secondary" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm ${
              item.verified
                ? 'line-through text-text-secondary'
                : 'text-text-primary font-medium'
            }`}
          >
            {item.criterion}
          </p>

          {item.verifiedAt && (
            <p className="text-xs text-text-secondary mt-1">
              Verified {item.verifiedBy === 'ai' ? 'by AI' : 'by you'} at{' '}
              {new Date(item.verifiedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {item.notes || isEditing ? (
          <button
            onClick={onToggleExpand}
            className="flex-shrink-0 px-2 py-1 text-xs text-accent-primary hover:bg-bg-secondary rounded"
          >
            {isExpanded ? 'Hide' : 'Show'} Notes
          </button>
        ) : null}
      </div>

      {isExpanded && (
        <div className="mt-3 pl-8 space-y-2">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="w-full p-2 bg-bg-tertiary border border-border-default rounded text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                placeholder="Add verification notes..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onSaveNotes}
                  loading={isUpdating}
                >
                  Save Notes
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-text-secondary">{item.notes}</p>
              <button
                onClick={onEditNotes}
                className="mt-2 text-xs text-accent-primary hover:underline"
              >
                Edit Notes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
