/**
 * WorkflowEngine Singleton
 *
 * Provides a global WorkflowEngine instance for the application.
 * This ensures all workflow API routes share the same engine instance
 * for event handling and workflow state management.
 */

import { WorkflowEngine } from './engine';

let engineInstance: WorkflowEngine | null = null;

/**
 * Get the global WorkflowEngine instance
 * Creates it on first call (lazy initialization)
 */
export function getWorkflowEngine(): WorkflowEngine {
  if (!engineInstance) {
    engineInstance = new WorkflowEngine();
  }
  return engineInstance;
}

/**
 * Reset the engine instance (for testing purposes)
 */
export function resetWorkflowEngine(): void {
  engineInstance = null;
}
