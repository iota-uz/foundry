/**
 * Step: GitHub Connection
 *
 * Second step of project creation wizard.
 * Collects GitHub token and project URL.
 * Validates and parses the URL in real-time.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { Input } from '@/components/shared';
import { GitHubPATSelector } from '../github-pat-selector';
import { parseGitHubProjectUrl } from '@/lib/projects/github-url-parser';

interface StepGitHubConnectionProps {
  credentialId: string | null;
  projectUrl: string;
  onCredentialChange: (credentialId: string | null) => void;
  onProjectUrlChange: (url: string) => void;
  onValidationChange: (isValid: boolean) => void;
  errors?: {
    credentialId?: string | undefined;
    projectUrl?: string | undefined;
  };
}

interface ParsedProject {
  owner: string;
  projectNumber: number;
  type: 'user' | 'org';
}

export function StepGitHubConnection({
  credentialId,
  projectUrl,
  onCredentialChange,
  onProjectUrlChange,
  onValidationChange,
  errors,
}: StepGitHubConnectionProps) {
  const [urlMessage, setUrlMessage] = useState('');
  const [parsedProject, setParsedProject] = useState<ParsedProject | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Validate GitHub connection
  const validateConnection = useCallback(async () => {
    if (!credentialId || !projectUrl) {
      setUrlMessage('');
      setParsedProject(null);
      onValidationChange(false);
      return;
    }

    setUrlMessage('');

    try {
      // Parse the project URL
      const parsed = parseGitHubProjectUrl(projectUrl);

      if (!parsed) {
        setUrlMessage('Invalid GitHub project URL format');
        setParsedProject(null);
        onValidationChange(false);
        return;
      }

      setParsedProject(parsed);
      onValidationChange(true);
    } catch {
      setParsedProject(null);
      onValidationChange(false);
    }
  }, [credentialId, projectUrl, onValidationChange]);

  // Debounced validation
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (credentialId && projectUrl) {
      debounceTimeout.current = setTimeout(validateConnection, 500);
    } else {
      setParsedProject(null);
      onValidationChange(false);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [credentialId, projectUrl, validateConnection, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* GitHub Credential Selector */}
      <GitHubPATSelector
        value={credentialId}
        onChange={onCredentialChange}
        {...(errors?.credentialId ? { error: errors.credentialId } : {})}
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
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckIcon className="w-3.5 h-3.5" />
                Parsed:
              </span>
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
