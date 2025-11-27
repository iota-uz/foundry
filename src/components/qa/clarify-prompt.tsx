'use client';

/**
 * Clarify Prompt Component
 *
 * Displays ambiguities detected after CPO phase.
 * Used in F7 - Automatic Clarify Phase.
 */

import { useState, useMemo } from 'react';
import type { Ambiguity } from '@/types/workflow/state';

interface ClarifyPromptProps {
  ambiguities: Ambiguity[];
  onResolve: (ambiguityId: string, resolution: string) => void;
  onDefer: (ambiguityId: string) => void;
  onDeferAll: () => void;
  disabled?: boolean;
}

const severityColors = {
  high: 'border-red-500 bg-red-900/20',
  medium: 'border-amber-500 bg-amber-900/20',
  low: 'border-blue-500 bg-blue-900/20',
};

const severityIcons = {
  high: '🔴',
  medium: '🟡',
  low: '🔵',
};

export function ClarifyPrompt({
  ambiguities,
  onResolve,
  onDefer,
  onDeferAll,
  disabled = false,
}: ClarifyPromptProps) {
  const [expandedSeverity, setExpandedSeverity] = useState<'high' | 'medium' | 'low' | null>('high');
  const [selectedAmbiguity, setSelectedAmbiguity] = useState<string | null>(null);
  const [customResolution, setCustomResolution] = useState<Record<string, string>>({});

  const groupedBySeverity = useMemo(() => {
    return {
      high: ambiguities.filter(a => a.severity === 'high' && a.status === 'pending'),
      medium: ambiguities.filter(a => a.severity === 'medium' && a.status === 'pending'),
      low: ambiguities.filter(a => a.severity === 'low' && a.status === 'pending'),
    };
  }, [ambiguities]);

  const totalPending = ambiguities.filter(a => a.status === 'pending').length;

  const handleSelectOption = (ambiguityId: string, option: string) => {
    onResolve(ambiguityId, option);
    setSelectedAmbiguity(null);
    setCustomResolution(prev => {
      const next = { ...prev };
      delete next[ambiguityId];
      return next;
    });
  };

  const handleCustomResolution = (ambiguityId: string) => {
    const resolution = customResolution[ambiguityId];
    if (resolution && resolution.trim()) {
      onResolve(ambiguityId, resolution.trim());
      setCustomResolution(prev => {
        const next = { ...prev };
        delete next[ambiguityId];
        return next;
      });
      setSelectedAmbiguity(null);
    }
  };

  if (totalPending === 0) {
    return (
      <div className="rounded-lg border border-green-700 bg-green-900/20 p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✓</span>
          <div>
            <h3 className="text-lg font-semibold text-green-300">No Ambiguities Found</h3>
            <p className="text-sm text-green-400/80">
              All requirements are clear. Proceeding to technical design phase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-white">Clarify Phase</h2>
        <p className="text-gray-400">
          I found <span className="font-semibold text-white">{totalPending}</span> areas that need
          clarification before technical design:
        </p>
      </div>

      {/* High Severity */}
      {groupedBySeverity.high.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandedSeverity(expandedSeverity === 'high' ? null : 'high')}
            className="flex w-full items-center justify-between rounded-lg border border-red-600 bg-red-900/20 p-4 hover:bg-red-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{severityIcons.high}</span>
              <div className="text-left">
                <h3 className="font-semibold text-red-300">High Priority</h3>
                <p className="text-xs text-red-400/80">
                  {groupedBySeverity.high.length} critical issues
                </p>
              </div>
            </div>
            <span className="text-gray-400">{expandedSeverity === 'high' ? '▼' : '▶'}</span>
          </button>

          {expandedSeverity === 'high' && (
            <div className="space-y-3 pl-4">
              {groupedBySeverity.high.map(ambiguity => (
                <AmbiguityCard
                  key={ambiguity.id}
                  ambiguity={ambiguity}
                  isSelected={selectedAmbiguity === ambiguity.id}
                  onSelect={() => setSelectedAmbiguity(ambiguity.id)}
                  onSelectOption={handleSelectOption}
                  onDefer={onDefer}
                  customResolution={customResolution[ambiguity.id] || ''}
                  onCustomResolutionChange={(value) =>
                    setCustomResolution(prev => ({ ...prev, [ambiguity.id]: value }))
                  }
                  onCustomResolutionSubmit={handleCustomResolution}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Medium Severity */}
      {groupedBySeverity.medium.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandedSeverity(expandedSeverity === 'medium' ? null : 'medium')}
            className="flex w-full items-center justify-between rounded-lg border border-amber-600 bg-amber-900/20 p-4 hover:bg-amber-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{severityIcons.medium}</span>
              <div className="text-left">
                <h3 className="font-semibold text-amber-300">Medium Priority</h3>
                <p className="text-xs text-amber-400/80">
                  {groupedBySeverity.medium.length} issues
                </p>
              </div>
            </div>
            <span className="text-gray-400">{expandedSeverity === 'medium' ? '▼' : '▶'}</span>
          </button>

          {expandedSeverity === 'medium' && (
            <div className="space-y-3 pl-4">
              {groupedBySeverity.medium.map(ambiguity => (
                <AmbiguityCard
                  key={ambiguity.id}
                  ambiguity={ambiguity}
                  isSelected={selectedAmbiguity === ambiguity.id}
                  onSelect={() => setSelectedAmbiguity(ambiguity.id)}
                  onSelectOption={handleSelectOption}
                  onDefer={onDefer}
                  customResolution={customResolution[ambiguity.id] || ''}
                  onCustomResolutionChange={(value) =>
                    setCustomResolution(prev => ({ ...prev, [ambiguity.id]: value }))
                  }
                  onCustomResolutionSubmit={handleCustomResolution}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Low Severity */}
      {groupedBySeverity.low.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandedSeverity(expandedSeverity === 'low' ? null : 'low')}
            className="flex w-full items-center justify-between rounded-lg border border-blue-600 bg-blue-900/20 p-4 hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{severityIcons.low}</span>
              <div className="text-left">
                <h3 className="font-semibold text-blue-300">Low Priority</h3>
                <p className="text-xs text-blue-400/80">
                  {groupedBySeverity.low.length} minor issues
                </p>
              </div>
            </div>
            <span className="text-gray-400">{expandedSeverity === 'low' ? '▼' : '▶'}</span>
          </button>

          {expandedSeverity === 'low' && (
            <div className="space-y-3 pl-4">
              {groupedBySeverity.low.map(ambiguity => (
                <AmbiguityCard
                  key={ambiguity.id}
                  ambiguity={ambiguity}
                  isSelected={selectedAmbiguity === ambiguity.id}
                  onSelect={() => setSelectedAmbiguity(ambiguity.id)}
                  onSelectOption={handleSelectOption}
                  onDefer={onDefer}
                  customResolution={customResolution[ambiguity.id] || ''}
                  onCustomResolutionChange={(value) =>
                    setCustomResolution(prev => ({ ...prev, [ambiguity.id]: value }))
                  }
                  onCustomResolutionSubmit={handleCustomResolution}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-3 rounded-lg border border-gray-700 bg-gray-800/40 p-4">
        <button
          onClick={onDeferAll}
          disabled={disabled}
          className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Defer All to CTO Phase
        </button>

        <div className="text-sm text-gray-400 flex items-center">
          {totalPending} pending
        </div>
      </div>
    </div>
  );
}

interface AmbiguityCardProps {
  ambiguity: Ambiguity;
  isSelected: boolean;
  onSelect: () => void;
  onSelectOption: (ambiguityId: string, option: string) => void;
  onDefer: (ambiguityId: string) => void;
  customResolution: string;
  onCustomResolutionChange: (value: string) => void;
  onCustomResolutionSubmit: (ambiguityId: string) => void;
  disabled: boolean;
}

function AmbiguityCard({
  ambiguity,
  isSelected,
  onSelect,
  onSelectOption,
  onDefer,
  customResolution,
  onCustomResolutionChange,
  onCustomResolutionSubmit,
  disabled,
}: AmbiguityCardProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isSelected ? severityColors[ambiguity.severity] : 'border-gray-700 bg-gray-800/40'
      }`}
    >
      {/* Ambiguity header */}
      <button
        onClick={onSelect}
        className="w-full text-left mb-3"
      >
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">{severityIcons[ambiguity.severity]}</span>
          <div className="flex-1">
            <p className="font-semibold text-white mb-1">"{ambiguity.text}"</p>
            <p className="text-xs text-gray-400">
              Context: {ambiguity.context}
            </p>
          </div>
        </div>
      </button>

      {isSelected && (
        <div className="space-y-3 mt-3 pt-3 border-t border-gray-700">
          {/* Question */}
          <p className="text-sm text-gray-300">{ambiguity.question}</p>

          {/* Options */}
          {ambiguity.options && ambiguity.options.length > 0 && (
            <div className="space-y-2">
              {ambiguity.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => onSelectOption(ambiguity.id, option)}
                  disabled={disabled}
                  className="w-full text-left rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:border-blue-500 hover:bg-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Custom answer */}
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              disabled={disabled}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Enter custom answer
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={customResolution}
                onChange={(e) => onCustomResolutionChange(e.target.value)}
                placeholder="Enter your clarification..."
                disabled={disabled}
                rows={3}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onCustomResolutionSubmit(ambiguity.id)}
                  disabled={disabled || !customResolution.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowCustomInput(false);
                    onCustomResolutionChange('');
                  }}
                  disabled={disabled}
                  className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Defer button */}
          <button
            onClick={() => onDefer(ambiguity.id)}
            disabled={disabled}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            Defer to CTO phase →
          </button>
        </div>
      )}
    </div>
  );
}
