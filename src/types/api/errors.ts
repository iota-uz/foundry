/**
 * API error types
 */

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Error codes
 */
export type ErrorCode =
  // Generic errors
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  // Git errors
  | 'GIT_CONFLICT'
  | 'GIT_ERROR'
  // LLM errors
  | 'LLM_ERROR'
  | 'LLM_TIMEOUT'
  // File system errors
  | 'FILE_ERROR'
  | 'FILE_NOT_FOUND'
  | 'FILE_PERMISSION_ERROR'
  // Workflow errors
  | 'WORKFLOW_ERROR'
  | 'STEP_ERROR'
  | 'CHECKPOINT_ERROR'
  | 'TIMEOUT_ERROR'
  // Domain errors
  | 'CONSTITUTION_ERROR'
  | 'ANALYSIS_ERROR'
  | 'CLARIFY_ERROR'
  | 'GENERATOR_ERROR'
  | 'HOOK_ERROR'
  // Duplicate/conflict errors
  | 'DUPLICATE_ID'
  | 'CIRCULAR_DEPENDENCY'
  | 'INVALID_STATE';

/**
 * Error details for validation errors
 */
export interface ValidationErrorDetails {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Create error response helper
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ErrorResponse {
  const error: ErrorResponse['error'] = {
    code,
    message,
  };

  if (details !== undefined) {
    error.details = details;
  }

  return { error };
}

/**
 * HTTP status code mapping for error codes
 */
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  GIT_CONFLICT: 409,
  GIT_ERROR: 500,
  LLM_ERROR: 502,
  LLM_TIMEOUT: 504,
  FILE_ERROR: 500,
  FILE_NOT_FOUND: 404,
  FILE_PERMISSION_ERROR: 403,
  WORKFLOW_ERROR: 500,
  STEP_ERROR: 500,
  CHECKPOINT_ERROR: 500,
  TIMEOUT_ERROR: 504,
  CONSTITUTION_ERROR: 400,
  ANALYSIS_ERROR: 500,
  CLARIFY_ERROR: 500,
  GENERATOR_ERROR: 500,
  HOOK_ERROR: 500,
  DUPLICATE_ID: 409,
  CIRCULAR_DEPENDENCY: 400,
  INVALID_STATE: 400,
};
