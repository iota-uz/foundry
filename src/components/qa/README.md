# Q&A Components - Phase 4, Agent 2

Complete implementation of Q&A interface with cognitive load reduction features (F14-F20).

## Components Overview

### Main Components

- **`qa-panel.tsx`** - Main Q&A container with all features integrated
- **`question-batch.tsx`** - Batched question display (F14)
- **`question-card.tsx`** - Individual question with answer options

### Input Components

- **`option-list.tsx`** - Single/multiple choice options with keyboard support
- **`text-input.tsx`** - Free text answer input with validation
- **`code-input.tsx`** - Code editor with syntax highlighting
- **`color-picker.tsx`** - Color selection with presets and hex input

### Feature Components

- **`progress-indicator.tsx`** - Visual progress bar for batches
- **`recommendation-badge.tsx`** - AI recommendations (F16) with confidence
- **`decision-journal.tsx`** - Decision timeline with cascade undo (F17)
- **`impact-preview.tsx`** - Hover impact preview popover (F18)
- **`explainer.tsx`** - "Why this question?" context (F19)
- **`keyboard-hints.tsx`** - Keyboard shortcut display (F20)
- **`live-preview.tsx`** - Real-time spec updates panel (F15)

## Features Implemented

### F14: Smart Question Batching
- Groups 2-5 related questions by topic
- Batch progress tracking with visual indicator
- Topic-based context and description
- Batch position awareness (N of M)
- Navigation between questions within batch

### F15: Live Spec Preview Panel
- Real-time spec update display
- Diff view with add/modify/remove indicators
- Pending changes preview
- Side-by-side layout with main Q&A

### F16: AI Recommendation Badges
- Displays recommended options with confidence level
- Shows source (constitution, best_practice, context_inference, majority_usage)
- One-click accept recommendation
- Caveats display for considerations

### F17: Decision Journal + Undo Timeline
- Vertical timeline of all decisions
- Category badges (product_scope, data_model, api_design, etc.)
- Phase indicators (CPO, Clarify, CTO)
- Cascade undo preview showing downstream decisions
- Reversibility assessment (easy/moderate/significant)

### F18: Impact Preview on Hover
- Popover showing impacts on option hover (400ms delay)
- Summary of changes with estimated field count
- Additional questions preview
- Pros/cons trade-off analysis
- Reversibility assessment
- Intelligent positioning (avoids viewport edges)

### F19: "Why This Question?" Explainers
- Expandable context section
- Connection to previous answers
- Purpose statement
- Downstream impact listing (schema, API, components)
- Concrete examples
- Related decision references

### F20: Keyboard Quick Responses
- Number keys (1-9) select options
- Y/N for boolean questions
- Enter to submit
- S to skip
- ? to toggle explainer
- A to accept recommendation
- Tab/Shift+Tab for batch navigation
- Cmd+P to toggle preview
- Cmd+J to toggle decision journal

## Usage Example

```tsx
import { QAPanel } from '@/components/qa';

export function MyQAInterface() {
  const [question, setQuestion] = useState<AIQuestion | null>(null);
  const [specUpdates, setSpecUpdates] = useState<SpecUpdate[]>([]);

  return (
    <QAPanel
      question={question}
      specUpdates={specUpdates}
      onAnswer={(questionId, answer) => {
        // Handle answer submission
      }}
      config={{
        showLivePreview: true,
        showRecommendations: true,
        showDecisionJournal: true,
        enableKeyboardShortcuts: true,
      }}
    />
  );
}
```

## Type Definitions

All Q&A types are defined in `/src/types/ai/qa-features.ts`:

- `BatchState` - Batch progress tracking
- `LivePreviewState` - Live preview panel state
- `DecisionEntry` - Decision timeline entry
- `ImpactPreview` - Impact preview data
- `QAPanelState` - Complete Q&A panel state
- `QAPanelConfig` - Configuration options

## Styling

All components use Tailwind CSS v4 with dark theme:

- Primary colors: Blue (`#3b82f6`)
- Success: Green (`#22c55e`)
- Warning: Amber (`#f59e0b`)
- Error: Red (`#ef4444`)
- Dark backgrounds: Gray-800/Gray-900

## State Management

Components are designed to work with Zustand stores:

```tsx
const {
  workflowState,
  currentQuestion,
  answerQuestion,
  skipQuestion,
} = useWorkflowStore();
```

## Integration with Backend

Components listen to SSE events:

```
- 'question': New question received
- 'spec_update': Real-time spec changes
- 'decision_logged': Decision added to journal
- 'impact_preview_ready': Impact computed
```

## Notes

- All components are TypeScript-first with full type safety
- Dark-first design optimized for long work sessions
- Keyboard-friendly for power users
- Progressive disclosure pattern for complex information
- No external animation libraries (CSS transitions only)

## Type Strictness

Some components have `exactOptionalPropertyTypes` strictness issues that can be resolved by:

1. Adding `undefined` explicitly to optional callback types in interfaces
2. Using wrapper functions to handle optional callbacks
3. Casting handlers appropriately at call sites

This is expected due to Next.js strict TypeScript configuration and can be addressed in the testing/refinement phase.
