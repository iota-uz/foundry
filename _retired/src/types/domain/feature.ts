/**
 * Feature types - core specification unit
 */

/**
 * Feature specification with business and technical details
 */
export interface Feature {
  id: string;
  slug: string; // Feature slug (e.g., "login", "checkout")
  moduleId: string;
  moduleSlug: string; // Parent module slug for clarity
  name: string;
  description: string;
  status: FeatureStatus;
  phase: FeaturePhase;
  implemented: boolean;
  source: FeatureSource;
  implementationFiles: ImplementationFile[];
  dependencies: string[]; // Feature IDs this depends on

  // Business requirements (CPO phase)
  business?: BusinessRequirements;

  // Technical details (CTO phase)
  technical?: TechnicalRequirements;

  // Implementation plan
  implementationPlan: ImplementationStep[];

  // Task breakdown (F8)
  tasks: Task[];
  taskProgress: TaskProgress;

  // Implementation checklist (F10)
  checklist: ChecklistItem[];
  checklistProgress: ChecklistProgress;

  createdAt: string;
  updatedAt: string;
}

/**
 * Feature completion status
 */
export type FeatureStatus = 'draft' | 'in_progress' | 'completed';

/**
 * Current workflow phase for feature
 */
export type FeaturePhase = 'cpo' | 'clarify' | 'cto' | 'complete';

/**
 * How feature was created
 */
export type FeatureSource = 'new' | 'reverse_engineered';

/**
 * Reference to implementation file
 */
export interface ImplementationFile {
  path: string;
  description: string;
}

/**
 * Business requirements from CPO phase
 */
export interface BusinessRequirements {
  userStory: string;
  acceptanceCriteria: string[];
  priority: FeaturePriority;
}

/**
 * Feature priority
 */
export type FeaturePriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Technical requirements from CTO phase
 */
export interface TechnicalRequirements {
  schemaRefs: SchemaReference[];
  apiRefs: APIReference[];
  componentRefs: ComponentReference[];
}

/**
 * Reference to database entity
 */
export interface SchemaReference {
  entity: string;
  usage: string;
}

/**
 * Reference to API endpoint
 */
export interface APIReference {
  type: 'rest' | 'graphql';
  method?: string; // For REST
  path?: string; // For REST
  operation?: string; // For GraphQL
}

/**
 * Reference to UI component
 */
export interface ComponentReference {
  id: string;
  type: 'page' | 'component';
}

/**
 * Implementation step from CTO phase
 */
export interface ImplementationStep {
  id: string;
  order: number;
  title: string;
  description: string;
  complexity: Complexity;
}

/**
 * Complexity level
 */
export type Complexity = 'low' | 'medium' | 'high';

/**
 * Task for tracking implementation
 */
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  complexity: Complexity;
  dependsOn: string[]; // Task IDs
  implementationStepId: string;
  completedAt?: string;
}

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Task progress summary
 */
export interface TaskProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percentComplete: number;
}

/**
 * Checklist item for acceptance criteria
 */
export interface ChecklistItem {
  id: string;
  criterion: string;
  source: string; // Reference to acceptance criteria
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: 'user' | 'ai';
  notes?: string;
}

/**
 * Checklist progress summary
 */
export interface ChecklistProgress {
  total: number;
  verified: number;
  percentComplete: number;
}
