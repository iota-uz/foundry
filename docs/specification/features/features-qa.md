---
layout: default
title: Q&A Phase Features
nav_order: 11
parent: Specification
---

# Q&A Phase Features

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

Features that enhance the question/answer experience during CPO, Clarify, and CTO workflows. These features reduce cognitive load, improve decision-making, and create immediate feedback loops during specification generation.

**When to Use:** Active during all Q&A workflow sessions (CPO → Clarify → CTO).

---

## Workflow Integration

### F7: Automatic Clarify Phase

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/clarify-detector.ts` - Ambiguity detection engine
- `src/app/api/workflows/clarify/route.ts` - Clarify phase API endpoints
- `src/components/ClarifyPhaseView.tsx` - Clarify phase UI
- `src/store/workflow.ts` - Workflow state management
- `src/lib/ambiguity-rules.ts` - Detection rules and patterns

#### Description

AI-driven ambiguity detection that runs automatically after CPO phase completes, surfacing unclear requirements before technical design begins.

#### Requirements

**Triggers:**
- Runs automatically when CPO phase marked complete
- Can be re-run manually at any time

**Detection Rules:**
| Issue Type | Example | Detection Method |
|------------|---------|------------------|
| Vague Language | "fast", "user-friendly" | Keyword matching |
| Missing Edge Cases | No error handling defined | Pattern analysis |
| Ambiguous Flows | Multiple interpretations | AI reasoning |
| Feature Conflicts | Contradicting requirements | Cross-reference check |

#### Decision Reference

See: decisions.md D17 (Clarify Phase - Automatic)

---

## Cognitive Load Reduction Features

### F14: Smart Question Batching

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/question-batcher.ts` - Question grouping and batching logic
- `src/components/QuestionBatch.tsx` - Batch UI component
- `src/store/qa.ts` - Q&A state management
- `src/lib/topic-clustering.ts` - Semantic topic grouping

#### Description

Groups 2-5 related questions with shared context, reducing mental overhead of topic switching during Q&A sessions. Based on Miller's Law (7±2 cognitive limit).

#### Requirements

**Batching Rules:**
| Rule | Description |
|------|-------------|
| Topic Clustering | Group questions by semantic domain (auth, data model, UX) |
| Dependency Ordering | Foundational questions first within each batch |
| Batch Size | 3-5 questions per batch (max 7) |
| Context Window | Each batch shares a context preamble explaining the topic |

**Batch Properties:**
- Topic name and description
- 2-7 related questions
- Estimated completion time
- Progress indicator (X/Y answered)
- Batch position (N of M total batches)

---

### F15: Live Spec Preview Panel

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/components/SpecPreviewPanel.tsx` - Live preview UI component
- `src/lib/spec-differ.ts` - Diff calculation and display logic
- `src/store/preview.ts` - Preview state management
- `src/components/DiffView.tsx` - Diff rendering component

#### Description

Shows specs updating in real-time as answers are provided, creating immediate feedback loops that reduce outcome uncertainty.

#### Requirements

**Preview Types:**
| Type | Content |
|------|---------|
| Summary | Artifact counts, high-level changes |
| Diff View | +/- line-by-line changes |
| Full Spec | Complete artifact content |

**Layout Options:**
- Split View (50/50): Default during Q&A
- Collapsed Preview: Small screens, user preference
- Full Preview: Reviewing before phase transition

---

### F16: AI Recommendation Badges

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/components/RecommendationBadge.tsx` - Badge UI component
- `src/lib/recommendation-engine.ts` - Recommendation scoring logic
- `src/lib/constitution.ts` - Constitution preference matching
- `src/store/recommendations.ts` - Recommendations state management

#### Description

Shows AI-suggested answers with confidence levels based on constitution preferences and project context.

---

### F17: Decision Journal + Undo Timeline

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/decision-journal.ts` - Decision logging and retrieval
- `src/components/DecisionTimeline.tsx` - Timeline UI component
- `src/app/api/decisions/route.ts` - Decision API endpoints
- `src/store/decisions.ts` - Decisions state management
- `src/lib/undo-manager.ts` - Undo/redo logic

#### Description

Browsable timeline of all decisions made during specification process.

---

### F18: Impact Preview on Hover

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/components/ImpactPreview.tsx` - Impact preview tooltip component
- `src/lib/impact-analyzer.ts` - Impact calculation logic
- `src/lib/dependency-graph.ts` - Dependency tracking
- `src/store/impacts.ts` - Impacts state management

#### Description

Shows consequences of selecting an option before committing to an answer.

---

### F19: "Why This Question?" Explainers

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/components/QuestionExplainer.tsx` - Explainer tooltip/modal component
- `src/lib/question-metadata.ts` - Question purpose and context storage
- `src/store/qa.ts` - Q&A state with explainer content
- `src/app/api/questions/explain/route.ts` - Question explanation API

#### Description

Context for each question's purpose and how it contributes to the specification.

---

### F20: Keyboard Quick Responses

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/hooks/useKeyboardShortcuts.ts` - Keyboard shortcut hook
- `src/components/QuestionDisplay.tsx` - Question UI with keyboard support
- `src/lib/keyboard-config.ts` - Keyboard mapping configuration
- `src/store/qa.ts` - Q&A state management

#### Description

Rapid answering via keyboard shortcuts (e.g., press 1-4 for single choice options).

---

## Dependencies

- **F7 (Clarify Phase)** depends on:
  - CPO Phase completion
  - Ambiguity detection engine

- **F14-F20** work together to:
  - Reduce cognitive load
  - Increase user engagement
  - Accelerate Q&A process
