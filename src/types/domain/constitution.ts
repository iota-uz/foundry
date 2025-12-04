/**
 * Constitution types - project governance and standards
 */

/**
 * Project constitution defining standards and constraints
 */
export interface Constitution {
  version: string;
  principles: string[];
  coding: CodingStandards;
  security: SecurityRequirements;
  ux: UXPatterns;
  constraints: TechConstraints;
  hooks: AgentHooks;
  createdAt: string;
  updatedAt: string;
}

/**
 * Coding standards and conventions
 */
export interface CodingStandards {
  naming: NamingConventions;
  style: StyleRules;
}

/**
 * Naming conventions
 */
export interface NamingConventions {
  functions: string;
  classes: string;
  database_tables: string;
  database_columns: string;
}

/**
 * Code style rules
 */
export interface StyleRules {
  max_function_length: number;
  require_docstrings: boolean;
  prefer_composition: boolean;
  [key: string]: string | number | boolean; // Allow custom rules
}

/**
 * Security requirements
 */
export interface SecurityRequirements {
  authentication: string;
  authorization: string;
  input_validation: string;
  secrets: string;
  password_hashing?: string;
  [key: string]: string | undefined; // Allow custom requirements
}

/**
 * UX patterns and guidelines
 */
export interface UXPatterns {
  error_format: string;
  loading_states: string;
  accessibility: string;
  responsive?: string;
  [key: string]: string | undefined; // Allow custom patterns
}

/**
 * Technology constraints
 */
export interface TechConstraints {
  allowed_libraries: string[];
  forbidden_libraries: string[];
  node_version: string;
  typescript?: string;
  [key: string]: string | string[] | undefined; // Allow custom constraints
}

/**
 * Event hooks configuration
 */
export interface AgentHooks {
  onFeatureSave?: HookAction[];
  onSchemaChange?: HookAction[];
  preCommit?: HookAction[];
  [key: string]: HookAction[] | undefined; // Allow custom hooks
}

/**
 * Hook action definition
 */
export interface HookAction {
  action: HookActionType;
  options?: Record<string, unknown>;
}

/**
 * Available hook actions
 */
export type HookActionType =
  | 'validateSchema'
  | 'updateChecklist'
  | 'regenerateAPIs'
  | 'runAnalyzer'
  | 'updateProgress'
  | 'notifyUser';
