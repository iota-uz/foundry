/**
 * Types for GitHub Issues REST API operations
 *
 * Provides types for managing labels and assignees on GitHub issues.
 */

/**
 * GitHub label
 */
export interface GitHubLabel {
  /** Label ID */
  id: number;
  /** Node ID (for GraphQL) */
  node_id: string;
  /** Label name */
  name: string;
  /** Color hex code (without #) */
  color: string;
  /** Optional description */
  description?: string | null;
  /** Whether this is a default label */
  default: boolean;
}

/**
 * GitHub user (simplified)
 */
export interface GitHubUser {
  /** User login */
  login: string;
  /** User ID */
  id: number;
  /** Node ID (for GraphQL) */
  node_id: string;
  /** Avatar URL */
  avatar_url: string;
  /** Profile URL */
  html_url: string;
}

/**
 * Result of a label operation
 */
export interface LabelOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Labels that were added/removed */
  labels: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Result of an assignee operation
 */
export interface AssigneeOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Assignees that were added/removed */
  assignees: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Error from GitHub API
 */
export interface GitHubError {
  message: string;
  documentation_url?: string;
}
