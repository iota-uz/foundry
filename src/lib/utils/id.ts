/**
 * ID generation utilities using nanoid
 */

import { nanoid } from 'nanoid';

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const id = nanoid();
  return (prefix !== undefined && prefix !== null && prefix !== '') ? `${prefix}_${id}` : id;
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return generateId('sess');
}

/**
 * Generate checkpoint ID
 */
export function generateCheckpointId(): string {
  return generateId('ckpt');
}

/**
 * Generate project ID
 */
export function generateProjectId(): string {
  return generateId('proj');
}

/**
 * Generate module ID
 */
export function generateModuleId(): string {
  return generateId('mod');
}

/**
 * Generate feature ID
 */
export function generateFeatureId(): string {
  return generateId('feat');
}

/**
 * Generate decision ID
 */
export function generateDecisionId(): string {
  return generateId('dec');
}

/**
 * Generate annotation ID
 */
export function generateAnnotationId(): string {
  return generateId('ann');
}

/**
 * Generate undo action ID
 */
export function generateUndoActionId(): string {
  return generateId('undo');
}

/**
 * Generate analysis ID
 */
export function generateAnalysisId(): string {
  return generateId('analysis');
}

/**
 * Generate step execution ID
 */
export function generateStepExecutionId(): string {
  return generateId('step');
}
