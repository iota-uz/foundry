'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shared';
import {
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type BudgetTier = 'development' | 'professional' | 'enterprise' | 'custom';

interface CostState {
  currentTokens: number;
  monthlyLimit: number;
  tier: BudgetTier;
  warningThreshold: number;
  disableLimits: boolean;
  resetDate: string;
}

const TIER_CONFIG = {
  development: { limit: 500000, warning: 400000 },
  professional: { limit: 2000000, warning: 1600000 },
  enterprise: { limit: 10000000, warning: 8000000 },
  custom: { limit: 0, warning: 0 },
};

const TOKEN_PRICING = {
  input: 0.003 / 1000,
  output: 0.015 / 1000,
};

export function CostManagement() {
  const [cost, setCost] = useState<CostState>({
    currentTokens: 125000,
    monthlyLimit: 500000,
    tier: 'development',
    warningThreshold: 400000,
    disableLimits: false,
    resetDate: new Date(new Date().setDate(1)).toISOString(),
  });

  const [customLimit, setCustomLimit] = useState('');

  const percentageUsed = (cost.currentTokens / cost.monthlyLimit) * 100;
  const tokensRemaining = cost.monthlyLimit - cost.currentTokens;
  const estimatedCost =
    cost.currentTokens * ((TOKEN_PRICING.input + TOKEN_PRICING.output) / 2);

  const isWarning = percentageUsed >= 80 && percentageUsed < 100;
  const isCritical = percentageUsed >= 100;

  const handleTierChange = async (newTier: BudgetTier) => {
    const config = TIER_CONFIG[newTier];
    setCost((prev) => ({
      ...prev,
      tier: newTier,
      monthlyLimit: config.limit,
      warningThreshold: config.warning,
    }));
  };

  const handleCustomLimitChange = async () => {
    if (!customLimit || isNaN(Number(customLimit))) {
      alert('Please enter a valid number');
      return;
    }

    const limit = Number(customLimit);
    setCost((prev) => ({
      ...prev,
      tier: 'custom',
      monthlyLimit: limit,
      warningThreshold: Math.floor(limit * 0.8),
    }));

    setCustomLimit('');
  };

  const handleReset = async () => {
    if (confirm('Reset monthly token usage? This cannot be undone.')) {
      setCost((prev) => ({
        ...prev,
        currentTokens: 0,
        resetDate: new Date().toISOString(),
      }));
    }
  };

  const getProgressBarColor = () => {
    if (isCritical) return 'bg-accent-error';
    if (isWarning) return 'bg-accent-warning';
    return 'bg-accent-success';
  };

  const getStatusLabel = () => {
    if (isCritical) return 'CRITICAL';
    if (isWarning) return 'WARNING';
    return 'HEALTHY';
  };

  const getStatusColor = () => {
    if (isCritical) return 'text-accent-error';
    if (isWarning) return 'text-accent-warning';
    return 'text-accent-success';
  };

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Token Usage
            </h3>
            <p className={`font-bold text-lg ${getStatusColor()}`}>
              {getStatusLabel()}
            </p>
          </div>
          {isWarning && (
            <ExclamationTriangleIcon className="h-6 w-6 text-accent-warning" />
          )}
          {isCritical && (
            <ExclamationTriangleIcon className="h-6 w-6 text-accent-error" />
          )}
        </div>

        {/* Usage stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-text-secondary mb-1">Tokens Used</p>
            <p className="text-2xl font-bold text-text-primary">
              {cost.currentTokens.toLocaleString()}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              ~${estimatedCost.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-1">Remaining</p>
            <p className="text-2xl font-bold text-accent-success">
              {tokensRemaining.toLocaleString()}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {Math.round(100 - percentageUsed)}% left
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Monthly Limit</span>
            <span className="font-semibold text-text-primary">
              {percentageUsed.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Warning message */}
      {isWarning && (
        <div className="p-4 bg-accent-warning/10 border border-accent-warning rounded-lg flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-accent-warning flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-accent-warning mb-1">
              Approaching Limit
            </h4>
            <p className="text-sm text-text-secondary">
              You are using {percentageUsed.toFixed(0)}% of your monthly budget.
              Consider upgrading your tier or disabling budget limits if you
              have an enterprise plan.
            </p>
          </div>
        </div>
      )}

      {isCritical && (
        <div className="p-4 bg-accent-error/10 border border-accent-error rounded-lg flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-accent-error flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-accent-error mb-1">
              Budget Limit Exceeded
            </h4>
            <p className="text-sm text-text-secondary">
              You have exceeded your monthly budget. AI operations are blocked
              until the budget resets. You can still view and edit your
              specifications.
            </p>
          </div>
        </div>
      )}

      {/* Budget tier selection */}
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Budget Tier
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(TIER_CONFIG).map(([tier, config]) => (
            <button
              key={tier}
              onClick={() => handleTierChange(tier as BudgetTier)}
              className={`
                p-4 rounded-lg border-2 transition-colors text-left
                ${
                  cost.tier === tier
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-default hover:border-accent-primary/50'
                }
              `}
            >
              <h4 className="font-semibold text-text-primary capitalize mb-1">
                {tier}
              </h4>
              {tier !== 'custom' && (
                <p className="text-sm text-text-secondary">
                  {(config.limit / 1000000).toFixed(1)}M tokens/month
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Custom limit input */}
        <div className="mt-4 p-4 bg-bg-tertiary rounded-lg">
          <label className="text-sm font-medium text-text-primary block mb-2">
            Custom Monthly Limit (tokens)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={customLimit}
              onChange={(e) => setCustomLimit(e.target.value)}
              placeholder="e.g., 1000000"
              className="flex-1 px-3 py-2 bg-bg-secondary text-text-primary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
            <Button onClick={handleCustomLimitChange} variant="secondary">
              Set
            </Button>
          </div>
        </div>
      </div>

      {/* Operations & Estimates */}
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Estimated Token Usage by Operation
        </h3>
        <div className="space-y-3 text-sm">
          {[
            { name: 'CPO Workflow', tokens: '20-30K', model: 'Sonnet' },
            { name: 'CTO Workflow', tokens: '30-50K', model: 'Sonnet' },
            { name: 'Schema Generator', tokens: '3-5K', model: 'Sonnet' },
            { name: 'Reverse Engineering', tokens: '100-200K', model: 'Opus' },
          ].map((op, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div>
                <span className="text-text-primary font-medium">{op.name}</span>
                <span className="text-text-tertiary ml-2">({op.model})</span>
              </div>
              <span className="text-accent-primary">{op.tokens}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={cost.disableLimits}
            onChange={(e) =>
              setCost((prev) => ({ ...prev, disableLimits: e.target.checked }))
            }
            className="w-4 h-4 rounded border-border-default bg-bg-secondary accent-accent-primary cursor-pointer"
          />
          <span className="text-sm text-text-secondary">
            Disable budget limits (Enterprise only)
          </span>
        </label>
        <Button onClick={handleReset} variant="secondary">
          Reset Budget
        </Button>
      </div>

      {/* Reset info */}
      <div className="p-3 bg-bg-tertiary rounded-lg text-sm text-text-secondary">
        Monthly budget resets on{' '}
        <strong>
          {new Date(cost.resetDate).toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
          })}
        </strong>
      </div>
    </div>
  );
}
