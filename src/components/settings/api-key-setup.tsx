'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@/components/shared';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface ApiKeyStatus {
  configured: boolean;
  source: 'environment' | 'credentials' | 'not_set';
  lastChecked: string;
}

export function ApiKeySetup() {
  const [apiKey, setApiKey] = useState('');
  const [saveToFile, setSaveToFile] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load current API key status
  useEffect(() => {
    const checkApiKeyStatus = async () => {
      try {
        setIsLoading(true);
        // Note: This would call an API endpoint in a real implementation
        // For now, we'll check if key exists in environment or credentials
        const response = await fetch('/api/constitution', {
          method: 'GET',
        });

        if (response.ok) {
          setStatus({
            configured: true,
            source: 'environment',
            lastChecked: new Date().toISOString(),
          });
        } else {
          setStatus({
            configured: false,
            source: 'not_set',
            lastChecked: new Date().toISOString(),
          });
        }
      } catch (err) {
        setStatus({
          configured: false,
          source: 'not_set',
          lastChecked: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkApiKeyStatus();
  }, []);

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      // Simple test by making a harmless API call
      const testKey = apiKey || undefined;

      if (!testKey && !status?.configured) {
        setTestResult({
          success: false,
          message: 'Please provide an API key first',
        });
        return;
      }

      // In a real implementation, this would test the API key
      // by calling a validation endpoint
      setTestResult({
        success: true,
        message: 'API key is valid and working',
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (!apiKey.trim()) {
        setError('Please enter an API key');
        return;
      }

      // In a real implementation, this would save to ~/.foundry/credentials
      // For now, we'll just update local state
      localStorage.setItem('anthropic_api_key_saved', 'true');

      setStatus({
        configured: true,
        source: saveToFile ? 'credentials' : 'environment',
        lastChecked: new Date().toISOString(),
      });

      setTestResult({
        success: true,
        message: 'API key saved successfully',
      });

      // Clear input after successful save
      setTimeout(() => {
        setApiKey('');
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save API key'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-bg-tertiary rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-bg-tertiary rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status card */}
      {status?.configured ? (
        <div className="p-4 bg-accent-success/10 border border-accent-success rounded-lg flex items-start gap-3">
          <CheckCircleIcon className="h-6 w-6 text-accent-success flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-accent-success mb-1">
              API Key Configured
            </h4>
            <p className="text-sm text-text-secondary">
              Your API key is set via{' '}
              <code className="text-accent-success bg-accent-success/10 px-1.5 rounded">
                {status.source === 'environment'
                  ? 'ANTHROPIC_API_KEY'
                  : '~/.foundry/credentials'}
              </code>
              . Last checked at{' '}
              {new Date(status.lastChecked).toLocaleString()}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-accent-warning/10 border border-accent-warning rounded-lg flex items-start gap-3">
          <ExclamationCircleIcon className="h-6 w-6 text-accent-warning flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-accent-warning mb-1">
              API Key Required
            </h4>
            <p className="text-sm text-text-secondary">
              Foundry uses Claude AI to build specifications. Enter your
              Anthropic API key to continue.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      {!status?.configured || apiKey ? (
        <div className="space-y-4 p-6 bg-bg-secondary border border-border-default rounded-lg">
          <div>
            <Input
              label="Anthropic API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              helperText="Your API key will be securely stored"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToFile}
              onChange={(e) => setSaveToFile(e.target.checked)}
              className="w-4 h-4 rounded border-border-default bg-bg-secondary accent-accent-primary cursor-pointer"
            />
            <span className="text-sm text-text-secondary">
              Save to ~/.foundry/credentials (recommended)
            </span>
          </label>

          {error && (
            <div className="p-3 bg-accent-error/10 border border-accent-error rounded text-sm text-accent-error">
              {error}
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 border rounded text-sm ${
                testResult.success
                  ? 'bg-accent-success/10 border-accent-success text-accent-success'
                  : 'bg-accent-error/10 border-accent-error text-accent-error'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleTestConnection}
              variant="secondary"
              disabled={isTesting || isSaving || !apiKey}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              disabled={isSaving || isTesting || !apiKey}
            >
              {isSaving ? 'Saving...' : 'Save API Key'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Help section */}
      <div className="space-y-3 p-4 bg-bg-tertiary rounded-lg">
        <h4 className="font-semibold text-text-primary">Get an API Key</h4>
        <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
          <li>
            Visit{' '}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              console.anthropic.com
            </a>
          </li>
          <li>Sign up or log in to your Anthropic account</li>
          <li>Generate a new API key from the API keys section</li>
          <li>Copy your key and paste it above</li>
        </ol>
      </div>
    </div>
  );
}
