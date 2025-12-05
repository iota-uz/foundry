'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';

/**
 * New Spec Wizard
 *
 * Allows users to create a new specification project by providing
 * basic project information like name and description.
 */
export default function NewSpecPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // TODO: Implement proper path selection (file picker or config)
      // For now, use a default placeholder path - the API will handle path resolution
      const projectPath = './projects';

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          path: projectPath,
          mode: 'new',
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create project';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If parsing fails, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Start CPO workflow for the created project
      const workflowResponse = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: data.project.id,
          workflowId: 'cpo-phase',
          mode: 'new',
        }),
      });

      if (!workflowResponse.ok) {
        let errorMessage = 'Failed to start workflow';
        try {
          const errorData = await workflowResponse.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If parsing fails, use the default message
        }
        throw new Error(errorMessage);
      }

      const workflowData = await workflowResponse.json();

      // Navigate to Q&A page with the session ID
      router.push(`/qa?sessionId=${workflowData.sessionId}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
          {/* Header */}
          <div className="border-b border-gray-700 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Create New Specification</h1>
            <p className="text-gray-400 text-sm mt-1">
              Let&apos;s start building your technical specification
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Name */}
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-300 mb-2">
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-saas-app"
                pattern="[a-zA-Z0-9-_]+"
                maxLength={50}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use letters, numbers, hyphens, and underscores only (max 50 characters)
              </p>
            </div>

            {/* Project Description */}
            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project..."
                rows={4}
                maxLength={500}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                {description.length}/500 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !name.trim() || !description.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Start Building Spec'}
              </Button>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• You&apos;ll answer questions in the CPO phase (product/business)</li>
            <li>• AI will detect ambiguities in the Clarify phase</li>
            <li>• Make technical decisions in the CTO phase</li>
            <li>• Generate schemas, APIs, and UI mockups automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
