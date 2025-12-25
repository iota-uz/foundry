/**
 * Step: Basic Info
 *
 * First step of project creation wizard.
 * Collects project name only.
 */

'use client';

import React from 'react';
import { Input } from '@/components/shared';

// ============================================================================
// Types
// ============================================================================

interface StepBasicInfoProps {
  name: string;
  onNameChange: (name: string) => void;
  errors?: {
    name?: string | undefined;
  };
}

// ============================================================================
// Component
// ============================================================================

export function StepBasicInfo({
  name,
  onNameChange,
  errors,
}: StepBasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* Project name */}
      <Input
        label="Project Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="My Awesome Project"
        error={errors?.name}
        maxLength={100}
        showCount
        autoFocus
      />

      {/* Tip */}
      <div className="p-4 rounded-lg bg-bg-tertiary border border-border-subtle">
        <p className="text-sm text-text-secondary">
          <span className="text-emerald-400 font-medium">Tip:</span> Choose a descriptive name
          that helps you identify this project among others. You can always change it later.
        </p>
      </div>
    </div>
  );
}
