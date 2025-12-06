/**
 * GitHub Projects module - Public API
 *
 * Provides integration with GitHub Projects V2 for managing
 * issue status updates via GraphQL API.
 */

// Types
export type {
  ProjectsConfig,
  Project,
  ProjectField,
  FieldOption,
  ProjectItem,
  ProjectItemFieldValue,
  ProjectFieldType,
  UpdateStatusRequest,
  UpdateStatusResult,
  ProjectValidation,
  ProjectsErrorCode,
} from './types';

export { ProjectsError } from './types';

// Client
export { ProjectsClient, createProjectsClient } from './client';
