/**
 * Step: GitHub Connection
 *
 * Second step of project creation wizard.
 * Collects GitHub token and project URL.
 * Validates and parses the URL in real-time.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/shared';
import { GitHubTokenInput } from '../github-token-input';
import { parseGitHubProjectUrl } from '@/lib/projects/github-url-parser';

interface StepGitHubConnectionProps {
  token: string;
  projectUrl: string;
  onTokenChange: (token: string) => void;
  onProjectUrlChange: (url: string) => void;
  onValidationChange: (isValid: boolean) => void;
  errors?: {
    token?: string | undefined;
    projectUrl?: string | undefined;
  };
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface ParsedProject {
  owner: string;
  projectNumber: number;
  type: 'user' | 'org';
}

export function StepGitHubConnection({
  token,
  projectUrl,
  onTokenChange,
  onProjectUrlChange,
  onValidationChange,
  errors,
}: StepGitHubConnectionProps) {
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [tokenMessage, setTokenMessage] = useState('');
  const [urlMessage, setUrlMessage] = useState('');
  const [parsedProject, setParsedProject] = useState<ParsedProject | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Validate GitHub connection
  const validateConnection = useCallback(async () => {
    if (!token || !projectUrl) {
      setValidationStatus('idle');
      setTokenMessage('');
      setUrlMessage('');
      setParsedProject(null);
      onValidationChange(false);
      return;
    }

    setValidationStatus('validating');
    setTokenMessage('');
    setUrlMessage('');

    try {
      // Parse the project URL
      const parsed = parseGitHubProjectUrl(projectUrl);

      if (!parsed) {
        setValidationStatus('invalid');
        setUrlMessage('Invalid GitHub project URL format');
        setParsedProject(null);
        onValidationChange(false);
        return;
      }

      // Basic token format check
      if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
        setValidationStatus('invalid');
        setTokenMessage('Invalid token format. Expected ghp_* or github_pat_*');
        setParsedProject(parsed);
        onValidationChange(false);
        return;
      }

      setValidationStatus('valid');
      setTokenMessage('Token format valid');
      setParsedProject(parsed);
      onValidationChange(true);
    } catch {
      setValidationStatus('invalid');
      setTokenMessage('Failed to validate connection');
      setParsedProject(null);
      onValidationChange(false);
    }
  }, [token, projectUrl, onValidationChange]);

  // Debounced validation
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (token && projectUrl) {
      debounceTimeout.current = setTimeout(validateConnection, 500);
    } else {
      setValidationStatus('idle');
      setParsedProject(null);
      onValidationChange(false);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [token, projectUrl, validateConnection, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* GitHub Token */}
      <GitHubTokenInput
        value={token}
        onChange={onTokenChange}
        validationStatus={validationStatus}
        validationMessage={tokenMessage}
        error={errors?.token}
      />

      {/* Project URL */}
      <div className="w-full">
        <Input
          label="GitHub Project URL"
          value={projectUrl}
          onChange={(e) => onProjectUrlChange(e.target.value)}
          placeholder="https://github.com/users/username/projects/1"
          error={errors?.projectUrl ?? urlMessage}
        />

        {/* Show parsed values as helper text */}
        {parsedProject && (
          <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-400 font-medium">✓ Parsed:</span>
              <span className="font-mono text-text-primary">
                {parsedProject.owner}
              </span>
              <span className="text-text-tertiary">/</span>
              <span className="font-mono text-text-primary">
                project #{parsedProject.projectNumber}
              </span>
              <span className="text-text-tertiary text-xs">
                ({parsedProject.type})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="p-4 rounded-lg bg-bg-tertiary border border-border-subtle">
        <h4 className="text-sm font-medium text-text-primary mb-2">
          Where to find these values?
        </h4>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 font-mono text-xs mt-0.5">1.</span>
            <span>
              Go to{' '}
              <code className="px-1.5 py-0.5 bg-bg-secondary rounded text-text-primary font-mono text-xs">
                github.com/settings/tokens
              </code>{' '}
              to create a Personal Access Token
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 font-mono text-xs mt-0.5">2.</span>
            <span>
              Copy the full project URL from your browser:
            </span>
          </li>
          <li className="pl-6 text-xs">
            <code className="px-1.5 py-0.5 bg-bg-secondary rounded text-text-primary font-mono">
              https://github.com/users/username/projects/1
            </code>
          </li>
          <li className="pl-6 text-xs">
            <span className="text-text-tertiary">or</span>
          </li>
          <li className="pl-6 text-xs">
            <code className="px-1.5 py-0.5 bg-bg-secondary rounded text-text-primary font-mono">
              https://github.com/orgs/orgname/projects/5
            </code>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 font-mono text-xs mt-0.5">3.</span>
            <span>
              Required scopes:{' '}
              <code className="px-1 py-0.5 bg-bg-secondary rounded text-emerald-400 font-mono text-xs">
                repo
              </code>{' '}
              and{' '}
              <code className="px-1 py-0.5 bg-bg-secondary rounded text-emerald-400 font-mono text-xs">
                project
              </code>
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
