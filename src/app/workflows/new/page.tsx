/**
 * New Workflow Page
 *
 * Creates a new workflow and redirects to the editor.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowBuilderStore } from '@/store';

export default function NewWorkflowPage() {
  const router = useRouter();
  const { newWorkflow } = useWorkflowBuilderStore();

  useEffect(() => {
    // Reset store for new workflow
    newWorkflow();

    // Create the workflow in the database
    async function createAndRedirect() {
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Untitled Workflow',
            description: '',
            nodes: [],
            edges: [],
            initialContext: {},
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create workflow');
        }

        const workflow = await response.json() as { id: string };
        router.replace(`/workflows/${workflow.id}`);
      } catch (error) {
        console.error('Failed to create workflow:', error);
        router.replace('/');
      }
    }

    createAndRedirect();
  }, [newWorkflow, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-bg-primary">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-text-secondary">Creating workflow...</p>
      </div>
    </div>
  );
}
