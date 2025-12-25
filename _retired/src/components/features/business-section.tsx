'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shared';
import { PencilIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { Feature } from '@/types';

interface BusinessSectionProps {
  feature: Feature;
  onUpdate?: (updates: Partial<Feature>) => Promise<void>;
  isEditing?: boolean;
}

export function BusinessSection({
  feature,
  onUpdate,
  isEditing: externalIsEditing,
}: BusinessSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(
    feature.business || { userStory: '', acceptanceCriteria: [], priority: 'medium' as const }
  );

  const actuallyEditing = externalIsEditing !== undefined ? externalIsEditing : isEditing;

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate({ business: formData });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCriteria = () => {
    setFormData((prev) => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, ''],
    }));
  };

  const handleUpdateCriteria = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.map((c, i) =>
        i === index ? value : c
      ),
    }));
  };

  const handleRemoveCriteria = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index),
    }));
  };

  if (!feature.business && !actuallyEditing) {
    return (
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Business Requirements
          </h3>
          {onUpdate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
              icon={<PencilIcon className="h-4 w-4" />}
            >
              Add
            </Button>
          )}
        </div>
        <p className="text-text-secondary">No business requirements defined yet</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          Business Requirements
        </h3>
        {onUpdate && !actuallyEditing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
            icon={<PencilIcon className="h-4 w-4" />}
          >
            Edit
          </Button>
        )}
      </div>

      {actuallyEditing ? (
        <div className="space-y-6">
          {/* User Story */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              User Story
            </label>
            <textarea
              value={formData.userStory}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, userStory: e.target.value }))
              }
              className="w-full p-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              rows={3}
              placeholder="As a... I want to... So that..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  priority: e.target.value as 'low' | 'medium' | 'high' | 'critical',
                }))
              }
              className="w-full p-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Acceptance Criteria */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Acceptance Criteria
            </label>
            <div className="space-y-2">
              {formData.acceptanceCriteria.map((criterion, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={criterion}
                    onChange={(e) => handleUpdateCriteria(index, e.target.value)}
                    className="flex-1 p-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="Criterion description"
                  />
                  <button
                    onClick={() => handleRemoveCriteria(index)}
                    className="px-3 py-2 text-text-secondary hover:text-accent-error rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddCriteria}
              >
                + Add Criterion
              </Button>
            </div>
          </div>

          {/* Save/Cancel */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              loading={isSaving}
              icon={<CheckIcon className="h-4 w-4" />}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Story */}
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">
              User Story
            </h4>
            <p className="text-text-primary whitespace-pre-wrap">{formData.userStory}</p>
          </div>

          {/* Priority Badge */}
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">
              Priority
            </h4>
            <div className="inline-block">
              <PriorityBadge priority={formData.priority} />
            </div>
          </div>

          {/* Acceptance Criteria */}
          {formData.acceptanceCriteria.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Acceptance Criteria
              </h4>
              <ul className="space-y-1">
                {formData.acceptanceCriteria.map((criterion, index) => (
                  <li key={index} className="flex items-start gap-2 text-text-primary">
                    <span className="text-accent-success flex-shrink-0 mt-0.5">✓</span>
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles = {
    low: 'bg-gray-900 text-gray-300 border border-gray-700',
    medium: 'bg-blue-900 text-blue-200 border border-blue-700',
    high: 'bg-amber-900 text-amber-200 border border-amber-700',
    critical: 'bg-red-900 text-red-200 border border-red-700',
  };

  return (
    <span
      className={`px-3 py-1 rounded-md text-sm font-medium ${styles[priority as keyof typeof styles]}`}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}
