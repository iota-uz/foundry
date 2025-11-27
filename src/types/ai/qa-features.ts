/**
 * Q&A Feature types (F14-F20)
 *
 * Comprehensive type definitions for cognitive load reduction features:
 * - F14: Smart Question Batching
 * - F15: Live Spec Preview Panel
 * - F16: AI Recommendation Badges
 * - F17: Decision Journal + Undo Timeline
 * - F18: Impact Preview on Hover
 * - F19: "Why This Question?" Explainers
 * - F20: Keyboard Quick Responses
 */

/**
 * Batch state for F14 - Smart Question Batching
 */
export interface BatchState {
  batchId: string;
  currentQuestionIndex: number;
  answeredCount: number;
  totalQuestions: number;
  isComplete: boolean;
}

/**
 * Live preview state for F15
 */
export interface LivePreviewState {
  isOpen: boolean;
  position: 'right' | 'bottom';
  diffMode: 'unified' | 'split' | 'highlight';
  updates: SpecUpdate[];
  pendingChanges: SpecChange[];
}

/**
 * Spec update from SSE event
 */
export interface SpecUpdate {
  id: string;
  type: 'add' | 'modify' | 'remove';
  section: string;
  path: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  artifactType: 'schema' | 'api' | 'component' | 'feature';
}

/**
 * Spec change pending confirmation
 */
export interface SpecChange {
  path: string;
  operation: 'add' | 'update' | 'delete';
  before?: any;
  after?: any;
}

/**
 * Decision journal entry for F17
 */
export interface DecisionEntry {
  id: string;
  questionId: string;
  questionText: string;
  answerGiven: any;
  alternatives: any[];
  category:
    | 'product_scope'
    | 'user_experience'
    | 'data_model'
    | 'api_design'
    | 'technology'
    | 'security'
    | 'performance'
    | 'integration';
  phase: 'cpo' | 'clarify' | 'cto';
  batchId?: string;
  artifactsAffected: AffectedArtifact[];
  cascadeGroup?: string;
  reversibility: 'easy' | 'moderate' | 'significant';
  aiRecommendation?: {
    optionId: string;
    confidence: 'high' | 'medium';
    reasoning: string;
  };
  recommendationFollowed?: boolean;
  createdAt: string;
  canUndo: boolean;
  undoneAt?: string;
}

/**
 * Artifact affected by a decision
 */
export interface AffectedArtifact {
  type: 'schema' | 'api' | 'component' | 'feature';
  id: string;
  changes: string[];
  fieldCount: number;
}

/**
 * Decision journal state
 */
export interface DecisionJournalState {
  entries: DecisionEntry[];
  currentIndex: number;
  filterPhase?: 'cpo' | 'clarify' | 'cto' | 'all';
  filterCategory?: string;
  previewCascade?: string[];
}

/**
 * Impact preview for an option (F18)
 */
export interface OptionImpact {
  summary: string;
  specChanges: {
    sections: string[];
    estimatedFields: number;
  };
  additionalQuestions: {
    estimate: number;
    topics: string[];
  };
  dependencies: {
    creates: string[];
    removes: string[];
  };
  pros: string[];
  cons: string[];
  reversibility: 'easy' | 'moderate' | 'significant';
}

/**
 * Impact preview popover state
 */
export interface ImpactPopoverState {
  isOpen: boolean;
  optionId: string | null;
  position: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  showDelay: number;
  hideDelay: number;
}

/**
 * Keyboard context and enabled shortcuts
 */
export type KeyboardContext =
  | 'global'
  | 'qa_single'
  | 'qa_multi'
  | 'qa_text'
  | 'qa_batch';

/**
 * Keyboard shortcuts configuration
 */
export interface KeyboardConfig {
  context: KeyboardContext;
  enabled: {
    numberSelection: boolean; // 1-9
    yesNo: boolean; // Y/N
    submit: boolean; // Enter
    skip: boolean; // S
    explainer: boolean; // ?
    acceptRecommendation: boolean; // A
    batchNavigation: boolean; // Tab/Shift+Tab
  };
  showHints: boolean;
}

/**
 * Keyboard state
 */
export interface KeyboardState {
  config: KeyboardConfig;
  lastKeyPressed?: string;
  lastActionTime?: number;
  confirmationPending?: {
    action: string;
    message: string;
    options: string[];
  };
}

/**
 * Explainer state
 */
export interface ExplainerState {
  isExpanded: boolean;
  defaultExpanded: boolean;
}

/**
 * Q&A panel configuration
 */
export interface QAPanelConfig {
  showBatchProgress: boolean;
  showLivePreview: boolean;
  showRecommendations: boolean;
  showDecisionJournal: boolean;
  showImpactPreviews: boolean;
  showExplainers: boolean;
  enableKeyboardShortcuts: boolean;
}

/**
 * Q&A panel state
 */
export interface QAPanelState {
  config: QAPanelConfig;
  batch: BatchState | null;
  livePreview: LivePreviewState;
  decisionJournal: DecisionJournalState;
  impactPopover: ImpactPopoverState;
  keyboard: KeyboardState;
  explainers: Record<string, ExplainerState>;
}

/**
 * Batch progress type
 */
export interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
  itemsAnswered: number;
  itemsRemaining: number;
}
