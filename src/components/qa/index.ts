/**
 * Q&A Components
 *
 * Feature-rich Q&A interface with cognitive load reduction features:
 * - F14: Smart Question Batching
 * - F15: Live Spec Preview Panel
 * - F16: AI Recommendation Badges
 * - F17: Decision Journal + Undo Timeline
 * - F18: Impact Preview on Hover
 * - F19: "Why This Question?" Explainers
 * - F20: Keyboard Quick Responses
 */

// Main components
export { QAPanel } from './qa-panel';
export { QuestionBatch } from './question-batch';
export { QuestionCard } from './question-card';

// Answer input components
export { OptionList } from './option-list';
export { TextInput } from './text-input';
export { CodeInput } from './code-input';
export { ColorPicker } from './color-picker';

// Feature-specific components
export { RecommendationBadge } from './recommendation-badge'; // F16
export { DecisionJournal } from './decision-journal'; // F17
export { ImpactPopover } from './impact-preview'; // F18
export { Explainer } from './explainer'; // F19
export { KeyboardHints } from './keyboard-hints'; // F20
export { LivePreview } from './live-preview'; // F15
export { ProgressIndicator } from './progress-indicator'; // F14
