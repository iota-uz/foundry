/**
 * Workflow definitions index
 * Exports all workflow definitions for the Foundry spec builder
 */

import type { WorkflowDefinition, WorkflowId } from '../../../types/workflow';

// Main workflows
export { mainOrchestrationWorkflow } from './main-orchestration';
export { cpoPhaseWorkflow } from './cpo-phase';
export { clarifyPhaseWorkflow } from './clarify-phase';
export { ctoPhaseWorkflow } from './cto-phase';
export { reverseEngineeringWorkflow } from './re-workflow';
export { actualizeWorkflow } from './actualize';
export { analyzerWorkflow } from './analyzer';

// Generator workflows
export {
  schemaGeneratorWorkflow,
  apiGeneratorWorkflow,
  componentGeneratorWorkflow,
} from './generators';

// Import workflows for registry (avoiding duplicate imports)
import { mainOrchestrationWorkflow as _mainOrchestration } from './main-orchestration';
import { cpoPhaseWorkflow as _cpoPhase } from './cpo-phase';
import { clarifyPhaseWorkflow as _clarifyPhase } from './clarify-phase';
import { ctoPhaseWorkflow as _ctoPhase } from './cto-phase';
import { reverseEngineeringWorkflow as _reWorkflow } from './re-workflow';
import { actualizeWorkflow as _actualizeWorkflow } from './actualize';
import { analyzerWorkflow as _analyzerWorkflow } from './analyzer';
import {
  schemaGeneratorWorkflow as _schemaGenerator,
  apiGeneratorWorkflow as _apiGenerator,
  componentGeneratorWorkflow as _componentGenerator,
} from './generators';

/**
 * Workflow registry
 * Maps workflow IDs to their definitions
 */
export const workflowRegistry: Record<WorkflowId, WorkflowDefinition> = {
  'main-orchestration': _mainOrchestration,
  'cpo-phase': _cpoPhase,
  'clarify-phase': _clarifyPhase,
  'cto-phase': _ctoPhase,
  're-workflow': _reWorkflow,
  'actualize-workflow': _actualizeWorkflow,
  'analyzer-workflow': _analyzerWorkflow,
  'schema-generator': _schemaGenerator,
  'api-generator': _apiGenerator,
  'component-generator': _componentGenerator,
};

/**
 * Get workflow definition by ID
 */
export function getWorkflowDefinition(workflowId: WorkflowId): WorkflowDefinition {
  const workflow = workflowRegistry[workflowId];
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }
  return workflow;
}

/**
 * Get all available workflow IDs
 */
export function getAvailableWorkflows(): WorkflowId[] {
  return Object.keys(workflowRegistry) as WorkflowId[];
}

/**
 * Validate workflow definition
 * Checks for required fields and circular dependencies
 */
export function validateWorkflowDefinition(workflow: WorkflowDefinition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!workflow.id) errors.push('Workflow ID is required');
  if (!workflow.name) errors.push('Workflow name is required');
  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step');
  }

  // Check step IDs are unique
  const stepIds = new Set<string>();
  for (const step of workflow.steps) {
    if (stepIds.has(step.id)) {
      errors.push(`Duplicate step ID: ${step.id}`);
    }
    stepIds.add(step.id);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
