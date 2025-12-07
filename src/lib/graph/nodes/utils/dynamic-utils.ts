/**
 * @sys/graph - Utilities for dynamic value resolution
 */

import type { WorkflowState, Dynamic } from '../../types';

/**
 * Resolves a dynamic value to its concrete form.
 * If the value is a function, it's called with the current state.
 * Otherwise, the value is returned as-is.
 */
export function resolveDynamic<T, TContext extends Record<string, unknown>>(
  value: Dynamic<T, TContext>,
  state: WorkflowState<TContext>
): T {
  if (typeof value === 'function') {
    return (value as (state: WorkflowState<TContext>) => T)(state);
  }
  return value;
}
