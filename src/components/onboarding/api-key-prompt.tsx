'use client';

/**
 * API Key Prompt (Onboarding Version)
 *
 * Simplified first-run prompt for API key if not in environment.
 */

import { useState } from 'react';
import { KeyIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface ApiKeyPromptProps {
  onComplete?: (apiKey: string) => Promise<void>;
  onSkip?: () => void;
}

export function ApiKeyPrompt({ onComplete, onSkip }: ApiKeyPromptProps) {
  const [apiKey, setApiKey] = useState('');
  const [saveToFile, setSaveToFile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Should start with sk-ant-');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onComplete?.(apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900/40 border border-blue-700 mb-4">
            <KeyIcon className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">API Key Required</h1>
          <p className="text-gray-400">
            Foundry uses Claude AI to build specifications. Enter your Anthropic API key to continue.
          </p>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 rounded-lg bg-amber-900/20 border border-amber-700 flex items-start gap-3">
          <ExclamationCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-semibold mb-1">No API key detected</p>
            <p className="text-amber-300/80">
              Set ANTHROPIC_API_KEY environment variable or enter your key below.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-2">
              Anthropic API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-2 rounded bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              aria-label="Anthropic API key"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your API key will be {saveToFile ? 'saved to ~/.foundry/credentials' : 'used for this session only'}
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToFile}
              onChange={(e) => setSaveToFile(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">
              Save to ~/.foundry/credentials (recommended)
            </span>
          </label>

          {error && (
            <div className="p-3 rounded bg-red-900/20 border border-red-700 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
              aria-label="Skip API key setup"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={!apiKey || loading}
              className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Save API key"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>

        {/* Help */}
        <div className="mt-6 p-4 rounded-lg bg-gray-800/40 border border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-2">{"Don't have an API key?"}</h3>
          <ol className="space-y-1 text-xs text-gray-400 list-decimal list-inside">
            <li>
              Visit{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                console.anthropic.com
              </a>
            </li>
            <li>Sign up or log in to your account</li>
            <li>Generate a new API key</li>
            <li>Copy and paste it above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
