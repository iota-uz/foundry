/**
 * Types for the GitHub Projects Integration
 *
 * Provides types for updating issue status in GitHub Projects V2
 * via GraphQL API.
 */

/**
 * Configuration for the GitHub Projects client
 */
export interface ProjectsConfig {
  /** GitHub personal access token (requires project scope) */
  token: string;
  /** Project owner (user or organization) */
  projectOwner: string;
  /** Project number (visible in project URL) */
  projectNumber: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Represents a GitHub Project V2
 */
export interface Project {
  /** Project node ID (used in GraphQL mutations) */
  id: string;
  /** Project title */
  title: string;
  /** Project number */
  number: number;
  /** Project URL */
  url: string;
  /** Whether this is a closed project */
  closed: boolean;
}

/**
 * Represents a single-select field option (e.g., status values)
 */
export interface FieldOption {
  /** Option node ID (used in mutations) */
  id: string;
  /** Option name (e.g., "In Progress", "Done") */
  name: string;
  /** Optional color for display */
  color?: string;
  /** Optional description */
  description?: string;
}

/**
 * Represents a field in a GitHub Project
 */
export interface ProjectField {
  /** Field node ID */
  id: string;
  /** Field name */
  name: string;
  /** Field type */
  dataType: ProjectFieldType;
  /** Options for single-select fields */
  options?: FieldOption[];
}

/**
 * Types of fields supported in GitHub Projects V2
 */
export type ProjectFieldType =
  | 'SINGLE_SELECT'
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'ITERATION'
  | 'MILESTONE'
  | 'LABELS'
  | 'LINKED_PULL_REQUESTS'
  | 'REVIEWERS'
  | 'REPOSITORY'
  | 'TITLE'
  | 'ASSIGNEES'
  | 'TRACKS'
  | 'TRACKED_BY';

/**
 * Represents an item in a GitHub Project (linked to an issue or PR)
 */
export interface ProjectItem {
  /** Item node ID (used in mutations) */
  id: string;
  /** The content (issue or PR) */
  content: {
    /** Content type */
    type: 'Issue' | 'PullRequest' | 'DraftIssue';
    /** Issue/PR number */
    number?: number;
    /** Issue/PR title */
    title: string;
    /** Repository reference */
    repository?: {
      owner: string;
      name: string;
    };
  };
  /** Current field values */
  fieldValues?: ProjectItemFieldValue[];
}

/**
 * A field value on a project item
 */
export interface ProjectItemFieldValue {
  /** Field node ID */
  fieldId: string;
  /** Field name */
  fieldName: string;
  /** Value (depends on field type) */
  value: string | number | null;
  /** For single-select: the option ID */
  optionId?: string;
}

/**
 * Request to update an issue's status in a project
 */
export interface UpdateStatusRequest {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Issue number */
  issueNumber: number;
  /** Target status name (must exactly match a status option) */
  status: string;
}

/**
 * Result of a status update operation
 */
export interface UpdateStatusResult {
  /** Whether the update succeeded */
  success: boolean;
  /** The project item that was updated */
  item?: ProjectItem;
  /** Previous status value (if available) */
  previousStatus?: string;
  /** New status value */
  newStatus: string;
  /** Error message if update failed */
  error?: string;
}

/**
 * Validation result for project configuration
 */
export interface ProjectValidation {
  /** Whether the project is valid and accessible */
  valid: boolean;
  /** Project details if found */
  project?: Project;
  /** Status field details if found */
  statusField?: ProjectField;
  /** Available status options */
  statusOptions?: FieldOption[];
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Error types for GitHub Projects operations
 */
export class ProjectsError extends Error {
  constructor(
    message: string,
    public readonly code: ProjectsErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProjectsError';
  }
}

/**
 * Error codes for GitHub Projects operations
 */
export type ProjectsErrorCode =
  | 'AUTH_ERROR'
  | 'PROJECT_NOT_FOUND'
  | 'FIELD_NOT_FOUND'
  | 'STATUS_NOT_FOUND'
  | 'ITEM_NOT_FOUND'
  | 'ISSUE_NOT_IN_PROJECT'
  | 'GRAPHQL_ERROR'
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR';
