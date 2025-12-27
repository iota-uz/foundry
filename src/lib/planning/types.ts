/**
 * Planning Types
 *
 * Types for the AI-powered issue planning system.
 */

// Planning status and phases
export type PlanningStatus =
  | 'not_started'
  | 'requirements'
  | 'clarify'
  | 'technical'
  | 'completed'
  | 'failed';

export type PlanningPhase = 'requirements' | 'clarify' | 'technical';

// Question types
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'text'
  | 'number'
  | 'code';

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  isRecommended?: boolean;
  recommendationReason?: string;
}

export interface AIQuestion {
  id: string;
  question: string;
  questionType: QuestionType;
  description?: string;
  whyAsking?: string; // "Why this question?" explanation
  options?: QuestionOption[];
  required: boolean;
  defaultValue?: unknown;
}

export interface QuestionBatch {
  batchId: string;
  phase: PlanningPhase;
  batchNumber: number;
  questions: AIQuestion[];
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimatedTimeMinutes: number;
  startedAt?: string;
  completedAt?: string;
}

export interface Answer {
  questionId: string;
  value: string | string[] | number | boolean;
  answeredAt: string;
  skipped: boolean;
}

// Artifact types
export interface MermaidDiagram {
  id: string;
  type: 'architecture' | 'data_flow' | 'sequence' | 'entity_relationship';
  title: string;
  mermaidCode: string;
  description: string;
  createdAt: string;
}

export interface ImplementationTask {
  id: string;
  title: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  dependsOn: string[];
  tags: string[];
  acceptanceCriteria: string[];
  order: number;
}

export interface ComponentSpec {
  id: string;
  name: string;
  type: 'page' | 'component';
  description: string;
  htmlPreview?: string;
  props?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

export interface APISpec {
  id: string;
  type: 'rest' | 'graphql';
  method?: string;
  path?: string;
  operation?: string;
  description: string;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
}

export interface PlanArtifacts {
  diagrams: MermaidDiagram[];
  tasks: ImplementationTask[];
  uiMockups: ComponentSpec[];
  apiSpecs: APISpec[];
}

// Main PlanContent structure (stored in issueMetadata.planContent)
export interface PlanContent {
  sessionId: string;
  status: PlanningStatus;
  currentPhase: PlanningPhase;
  questionBatches: QuestionBatch[];
  currentBatchIndex: number;
  answers: Record<string, Answer>;
  artifacts: PlanArtifacts;
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
}

// SSE Event types
export type PlanningSSEEvent =
  | { type: 'connected'; data: { sessionId: string } }
  | { type: 'phase_started'; data: { phase: PlanningPhase } }
  | { type: 'batch_generated'; data: { batch: QuestionBatch } }
  | { type: 'waiting_for_input'; data: { batchId: string } }
  | { type: 'answers_received'; data: { batchId: string; count: number } }
  | { type: 'phase_completed'; data: { phase: PlanningPhase } }
  | { type: 'generating_artifact'; data: { artifactType: string } }
  | { type: 'artifact_generated'; data: { artifactType: string; artifactId: string } }
  | { type: 'planning_completed'; data: { summary: PlanArtifacts } }
  | { type: 'planning_failed'; data: { error: string } }
  | { type: 'progress'; data: { message: string; progress: number } }
  | { type: 'agent_activity'; data: AgentActivityEvent };

// API request/response types
export interface StartPlanRequest {
  issueTitle?: string;
  issueBody?: string;
  preferences?: {
    diagramTypes?: MermaidDiagram['type'][];
    taskGranularity?: 'coarse' | 'medium' | 'fine';
  };
}

export interface StartPlanResponse {
  sessionId: string;
  workflowId: string;
  status: 'started';
  streamUrl: string;
}

export interface SubmitAnswersRequest {
  sessionId: string;
  batchId: string;
  answers: Array<{
    questionId: string;
    value: string | string[] | number | boolean;
  }>;
  skippedQuestions?: string[];
}

export interface SubmitAnswersResponse {
  accepted: boolean;
  nextBatch?: QuestionBatch;
  completed?: boolean;
}

export interface GetPlanResponse {
  planContent: PlanContent | null;
  sessionId?: string;
  workflowStatus?: string;
}

// Agent Activity Event types (for real-time activity streaming)
export type AgentActivityType =
  | 'tool_start'
  | 'tool_result'
  | 'text_delta'
  | 'thinking'
  | 'error';

export interface AgentActivityData {
  /** Tool name for tool_start/tool_result events */
  toolName?: string | undefined;
  /** Tool input parameters for tool_start events */
  toolInput?: Record<string, unknown> | undefined;
  /** Tool output for tool_result events */
  toolOutput?: unknown;
  /** Tool use ID to correlate start/result */
  toolUseId?: string | undefined;
  /** Whether tool execution succeeded */
  success?: boolean | undefined;
  /** Text content for text_delta events */
  textDelta?: string | undefined;
  /** Thinking content for thinking events */
  thinkingContent?: string | undefined;
  /** Error message for error events */
  errorMessage?: string | undefined;
  /** Error code for error events */
  errorCode?: string | undefined;
  /** File path for file operations (Read, Write, Edit) */
  filePath?: string | undefined;
}

export interface AgentActivityEvent {
  /** Unique ID for this activity */
  id: string;
  /** Type of activity */
  activityType: AgentActivityType;
  /** ISO timestamp */
  timestamp: string;
  /** Node ID where activity occurred */
  nodeId: string;
  /** Activity-specific data */
  data: AgentActivityData;
}
