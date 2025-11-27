'use client';

/**
 * F13: Actualize UI Wizard
 *
 * Main wizard for analyzing codebase and applying spec changes.
 * Workflow: Select codebase → Analyze → Review diffs → Apply changes
 */

import { useState } from 'react';
import {
  FolderIcon,
  MagnifyingGlassIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { DiffViewer, type DiffEntry } from './diff-viewer';
import { ChangeReview, type ChangeItem } from './change-review';

type WizardStep = 'select' | 'analyze' | 'review' | 'apply' | 'complete';

interface ActualizeWizardProps {
  projectPath: string;
  onComplete?: () => void;
}

export function ActualizeWizard({ projectPath, onComplete }: ActualizeWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select');
  const [codebasePath, setCodebasePath] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [diffs, setDiffs] = useState<DiffEntry[]>([]);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectCodebase = async () => {
    if (!codebasePath) return;

    setCurrentStep('analyze');
    setAnalyzing(true);
    setError(null);

    try {
      // TODO: Implement API call to analyze codebase
      const response = await fetch('/api/actualize/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          codebasePath,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze codebase');
      }

      const data = await response.json();
      setDiffs(data.diffs || []);

      // Convert diffs to change items
      const changeItems: ChangeItem[] = (data.diffs || []).map((diff: DiffEntry, idx: number) => ({
        id: `change-${idx}`,
        filePath: diff.filePath,
        changeType: diff.changeType,
        description: `${diff.changeType === 'added' ? 'Add' : diff.changeType === 'modified' ? 'Update' : 'Delete'} ${diff.filePath}`,
        impact: diff.diff.length > 50 ? 'high' : diff.diff.length > 10 ? 'medium' : 'low',
        diff,
        selected: true, // Default to selected
      }));
      setChanges(changeItems);

      setCurrentStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setCurrentStep('select');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleChange = (changeId: string) => {
    setChanges((prev) =>
      prev.map((c) => (c.id === changeId ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleSelectAll = () => {
    setChanges((prev) => prev.map((c) => ({ ...c, selected: true })));
  };

  const handleDeselectAll = () => {
    setChanges((prev) => prev.map((c) => ({ ...c, selected: false })));
  };

  const handleApplyChanges = async () => {
    const selectedChanges = changes.filter((c) => c.selected);
    if (selectedChanges.length === 0) return;

    setApplying(true);
    setError(null);

    try {
      // TODO: Implement API call to apply changes
      const response = await fetch('/api/actualize/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          codebasePath,
          changes: selectedChanges.map((c) => ({
            filePath: c.filePath,
            changeType: c.changeType,
            diff: c.diff,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply changes');
      }

      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  };

  const renderStepIndicator = () => {
    const steps: { id: WizardStep; label: string; icon: typeof FolderIcon }[] = [
      { id: 'select', label: 'Select Codebase', icon: FolderIcon },
      { id: 'analyze', label: 'Analyze', icon: MagnifyingGlassIcon },
      { id: 'review', label: 'Review', icon: DocumentCheckIcon },
      { id: 'complete', label: 'Complete', icon: CheckCircleIcon },
    ];

    const stepIndex = steps.findIndex((s) => s.id === currentStep);

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === stepIndex;
          const isCompleted = idx < stepIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border
                  ${
                    isActive
                      ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                      : isCompleted
                      ? 'border-green-500 bg-green-900/20 text-green-300'
                      : 'border-gray-700 bg-gray-800/40 text-gray-500'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{step.label}</span>
                {isCompleted && <CheckCircleIcon className="h-4 w-4" />}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-700 mx-1" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Actualize Specification</h1>
        <p className="text-gray-400">
          Sync your specification with your codebase
        </p>
        {renderStepIndicator()}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/20 border border-red-700 text-red-300">
            {error}
          </div>
        )}

        {/* Step 1: Select Codebase */}
        {currentStep === 'select' && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Codebase Path
                </label>
                <input
                  type="text"
                  value={codebasePath}
                  onChange={(e) => setCodebasePath(e.target.value)}
                  placeholder="/path/to/your/codebase"
                  className="w-full px-4 py-2 rounded bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  aria-label="Codebase path"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the path to the codebase you want to sync with this specification
                </p>
              </div>

              <button
                onClick={handleSelectCodebase}
                disabled={!codebasePath || analyzing}
                className="w-full px-4 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzing ? 'Analyzing...' : 'Analyze Codebase'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {currentStep === 'analyze' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MagnifyingGlassIcon className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-white mb-2">Analyzing Codebase</h3>
              <p className="text-gray-400">
                Comparing specification with code...
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review Changes */}
        {currentStep === 'review' && (
          <div className="flex h-full gap-4">
            {/* Left: Change review */}
            <div className="w-96 border-r border-gray-700">
              <ChangeReview
                changes={changes}
                onToggleChange={handleToggleChange}
                onApplySelected={handleApplyChanges}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                applying={applying}
              />
            </div>

            {/* Right: Diff viewer */}
            <div className="flex-1">
              <DiffViewer
                diffs={diffs}
                selectedFile={selectedFile || undefined}
                onSelectFile={setSelectedFile}
                viewMode={viewMode}
                onToggleViewMode={() =>
                  setViewMode((prev) => (prev === 'split' ? 'unified' : 'split'))
                }
              />
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 'complete' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Changes Applied Successfully</h3>
              <p className="text-gray-400 mb-6">
                Your codebase has been synchronized with the specification.
              </p>
              <button
                onClick={onComplete}
                className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
