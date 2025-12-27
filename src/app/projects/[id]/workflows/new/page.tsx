/**
 * New Workflow Page
 *
 * Creates a new workflow within a project and redirects to the editor.
 */

'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowBuilderStore } from '@/store';
import { createWorkflowAction } from '@/lib/actions/workflows';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NewWorkflowPage({ params }: PageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { newWorkflow, updateMetadata } = useWorkflowBuilderStore();

  useEffect(() => {
    // Reset store for new workflow
    newWorkflow();
    // Set the projectId in metadata
    updateMetadata({ projectId });

    // Create the workflow in the database
    async function createAndRedirect() {
      try {
        const result = await createWorkflowAction({
          projectId,
          name: 'Untitled Workflow',
          description: '',
          nodes: [],
          edges: [],
          initialContext: {},
        });

        if (result.data?.workflow) {
          router.replace(`/projects/${projectId}/workflows/${result.data.workflow.id}`);
        } else {
          throw new Error('Failed to create workflow');
        }
      } catch (error) {
        console.error('Failed to create workflow:', error);
        router.replace(`/projects/${projectId}`);
      }
    }

    void createAndRedirect();
  }, [projectId, newWorkflow, updateMetadata, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-bg-primary">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-text-secondary">Creating workflow...</p>
      </div>
    </div>
  );
}
